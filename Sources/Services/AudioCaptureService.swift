import AVFoundation
import Accelerate
import CoreAudio

final class AudioCaptureService {
    /// Keep capturing briefly after the stop gesture so the user's last word is not clipped.
    private static let stopGraceMs: UInt64 = 450

    private var audioEngine = AVAudioEngine()
    private var audioConverter: AVAudioConverter?
    private let targetFormat: AVAudioFormat

    // Accumulation
    private var accumulatedSamples: [Float] = []
    private var accumulatedDuration: TimeInterval = 0
    private var retainFullSessionAudio = false
    private var retainedSessionSamples: [Float] = []
    private var retainedSessionExceededLimit = false
    private static let maxRetainedSessionSamples = 16000 * 60 * 5
    private let lock = NSLock()

    // Smart VAD — pause detection
    private var voiceDetected = false
    private var silenceDuration: TimeInterval = 0
    private var silencePauseThreshold: TimeInterval = 0.8
    private var minChunkDuration: TimeInterval = 2.0
    private var maxChunkDuration: TimeInterval = 12.0

    /// Configure VAD thresholds — call before startRecording
    func configureForCloudMode(_ cloud: Bool) {
        lock.lock()
        retainFullSessionAudio = cloud
        retainedSessionSamples.removeAll(keepingCapacity: cloud)
        retainedSessionExceededLimit = false
        lock.unlock()

        if cloud {
            // Cloud audio is retained as one session and sent once at stop.
            silencePauseThreshold = 0.8
            minChunkDuration = 2.0
            maxChunkDuration = 12.0
        } else {
            // Local (WhisperKit): needs longer chunks for accuracy
            silencePauseThreshold = 0.8  // 800ms pause
            minChunkDuration = 2.0       // 2s min
            maxChunkDuration = 12.0      // 12s max
        }
    }

    // Callbacks
    private var onChunkReady: (([Float]) -> Void)?

    // Reconnection state
    private var lastChunkDuration: Double = 2.0
    private var lastSilenceThreshold: Float = 0.04
    private var isCurrentlyRecording = false

    // Device change handling
    var onDeviceChanged: (() -> Void)?
    private var deviceChangeListenerID: AudioObjectPropertyListenerBlock?
    private var reconnectWorkItem: DispatchWorkItem?    // Debounce
    private var isReconnecting = false                  // Prevent overlapping reconnects
    private var engineNeedsReset = false                // Flag stale engine after device change

    // Watchdog — detect stalled audio engine
    private var lastBufferTime: Date = Date()
    private var watchdogTimer: DispatchSourceTimer?

    init() {
        // WhisperKit requires: 16000 Hz, 1 channel, Float32
        targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        )!
        startDeviceChangeListener()
    }

    deinit {
        stopDeviceChangeListener()
    }

    // MARK: - Device Change Detection

    private func startDeviceChangeListener() {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        let listener: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
            guard let self else { return }
            let deviceName = self.getCurrentInputDeviceName()
            logToFile("Audio device changed → \(deviceName)")

            // Debounce: cancel previous reconnect, wait 1.5s for device to stabilize
            self.reconnectWorkItem?.cancel()
            let work = DispatchWorkItem { [weak self] in
                guard let self else { return }
                if self.isCurrentlyRecording {
                    logToFile("Debounced device change — reconnecting to: \(self.getCurrentInputDeviceName())")
                    self.onDeviceChanged?()
                } else {
                    // Not recording — flag engine as stale so next startRecording() creates fresh engine
                    logToFile("Device changed while idle — flagging engine for reset")
                    self.engineNeedsReset = true
                }
            }
            self.reconnectWorkItem = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: work)
        }
        deviceChangeListenerID = listener

        AudioObjectAddPropertyListenerBlock(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            DispatchQueue.main,
            listener
        )
    }

    private func stopDeviceChangeListener() {
        reconnectWorkItem?.cancel()
        guard let listener = deviceChangeListenerID else { return }
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        AudioObjectRemovePropertyListenerBlock(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            DispatchQueue.main,
            listener
        )
    }

    /// Get the name of the current default input device (for logging)
    private func getCurrentInputDeviceName() -> String {
        var deviceID = AudioDeviceID(0)
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        let status = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &address, 0, nil, &size, &deviceID
        )
        guard status == noErr else { return "Unknown (error \(status))" }

        var nameAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceNameCFString,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var name: CFString = "" as CFString
        var nameSize = UInt32(MemoryLayout<CFString>.size)
        AudioObjectGetPropertyData(deviceID, &nameAddress, 0, nil, &nameSize, &name)
        return name as String
    }

    /// Reconnect with retry logic — handles external mic connect/disconnect
    func reconnect() throws {
        guard isCurrentlyRecording, let callback = onChunkReady else { return }
        guard !isReconnecting else {
            logToFile("Reconnect already in progress — skipping")
            return
        }
        isReconnecting = true

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                logToFile("Reconnect attempt \(attempt)/\(maxRetries) to: \(getCurrentInputDeviceName())")

                // Stop old engine completely
                audioEngine.inputNode.removeTap(onBus: 0)
                audioEngine.stop()
                audioEngine.reset()

                // Create completely fresh engine — required after device change
                audioEngine = AVAudioEngine()
                audioConverter = nil

                // Small delay to let the new engine pick up the new device
                Thread.sleep(forTimeInterval: 0.3)

                // Verify the new input device is valid
                let inputNode = audioEngine.inputNode
                let inputFormat = inputNode.outputFormat(forBus: 0)

                guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
                    logToFile("Reconnect attempt \(attempt): input format invalid (sr=\(inputFormat.sampleRate), ch=\(inputFormat.channelCount))")
                    if attempt < maxRetries {
                        Thread.sleep(forTimeInterval: Double(attempt))  // 1s, 2s backoff
                        continue
                    }
                    throw AudioError.noInputDevice
                }

                logToFile("New input format: \(inputFormat.sampleRate)Hz, \(inputFormat.channelCount)ch")

                // Clear accumulated samples (they were from the old device/format)
                lock.lock()
                accumulatedSamples.removeAll()
                accumulatedDuration = 0
                voiceDetected = false
                silenceDuration = 0
                lock.unlock()

                // Restart with saved parameters
                try startRecording(
                    chunkDuration: lastChunkDuration,
                    silenceThreshold: lastSilenceThreshold,
                    onChunkReady: callback
                )

                logToFile("Reconnected successfully to: \(getCurrentInputDeviceName())")
                isReconnecting = false
                return

            } catch {
                lastError = error
                logToFile("Reconnect attempt \(attempt) failed: \(error.localizedDescription)")
                if attempt < maxRetries {
                    Thread.sleep(forTimeInterval: Double(attempt))  // 1s, 2s backoff
                }
            }
        }

        isReconnecting = false
        logToFile("All reconnect attempts failed!")
        throw lastError ?? AudioError.noInputDevice
    }

    func startRecording(
        chunkDuration: Double,
        silenceThreshold: Float,
        onChunkReady: @escaping ([Float]) -> Void
    ) throws {
        self.onChunkReady = onChunkReady
        self.lastChunkDuration = chunkDuration
        self.lastSilenceThreshold = silenceThreshold
        accumulatedSamples.removeAll()
        accumulatedDuration = 0
        voiceDetected = false
        silenceDuration = 0
        isCurrentlyRecording = true

        // Always create fresh engine to pick up current default input device
        // This prevents stale engine issues after device changes
        if engineNeedsReset || !audioEngine.isRunning {
            logToFile("Creating fresh audio engine (reset=\(engineNeedsReset), running=\(audioEngine.isRunning))")
            audioEngine.inputNode.removeTap(onBus: 0)
            audioEngine.stop()
            audioEngine.reset()
            audioEngine = AVAudioEngine()
            audioConverter = nil
            engineNeedsReset = false
        }

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
            throw AudioError.noInputDevice
        }

        logToFile("Starting recording — device: \(getCurrentInputDeviceName()), format: \(inputFormat.sampleRate)Hz \(inputFormat.channelCount)ch")

        // Create converter from hardware format to 16kHz mono
        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            throw AudioError.converterCreationFailed
        }
        audioConverter = converter

        inputNode.installTap(
            onBus: 0,
            bufferSize: 4096,
            format: inputFormat
        ) { [weak self] buffer, _ in
            self?.processBuffer(
                buffer,
                chunkDuration: chunkDuration,
                silenceThreshold: silenceThreshold
            )
        }

        audioEngine.prepare()
        try audioEngine.start()
        startWatchdog()
    }

    // MARK: - Audio Watchdog

    private func startWatchdog() {
        stopWatchdog()
        lastBufferTime = Date()
        let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.global())
        timer.schedule(deadline: .now() + 5, repeating: 5)
        timer.setEventHandler { [weak self] in
            guard let self, self.isCurrentlyRecording else { return }
            let elapsed = Date().timeIntervalSince(self.lastBufferTime)
            if elapsed > 10 {
                logToFile("WATCHDOG: No audio buffers for \(Int(elapsed))s — forcing reconnect")
                DispatchQueue.main.async {
                    self.onDeviceChanged?()  // Trigger reconnect via debounced path
                }
            }
        }
        timer.resume()
        watchdogTimer = timer
    }

    private func stopWatchdog() {
        watchdogTimer?.cancel()
        watchdogTimer = nil
    }

    /// Stop after the grace window and return all remaining accumulated audio.
    @MainActor
    func stopRecording() async -> [Float]? {
        let graceStartedAt = Date()
        try? await Task.sleep(nanoseconds: Self.stopGraceMs * 1_000_000)
        logToFile("Audio stop grace: \(Int(Date().timeIntervalSince(graceStartedAt) * 1000))ms captured before teardown")

        isCurrentlyRecording = false
        reconnectWorkItem?.cancel()
        stopWatchdog()
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()

        lock.lock()
        let remaining = accumulatedSamples.isEmpty ? nil : accumulatedSamples
        accumulatedSamples.removeAll()
        accumulatedDuration = 0
        lock.unlock()

        return remaining
    }

    /// Consume the full cloud session captured at 16kHz mono.
    /// Sessions over five minutes are flagged so callers can reject instead of truncating.
    func takeRetainedCloudSession() -> (samples: [Float], exceededLimit: Bool) {
        lock.lock()
        let result = (retainedSessionSamples, retainedSessionExceededLimit)
        retainedSessionSamples.removeAll()
        retainedSessionExceededLimit = false
        lock.unlock()
        return result
    }

    // MARK: - Private

    private var bufferLogCounter = 0

    private func processBuffer(
        _ buffer: AVAudioPCMBuffer,
        chunkDuration: Double,
        silenceThreshold: Float
    ) {
        // Convert to 16kHz mono
        guard let converted = convertToTarget(buffer) else {
            bufferLogCounter += 1
            if bufferLogCounter % 50 == 1 { logToFile("processBuffer: conversion FAILED (count=\(bufferLogCounter))") }
            return
        }
        guard let channelData = converted.floatChannelData?[0] else { return }

        let frameCount = Int(converted.frameLength)
        let samples = Array(UnsafeBufferPointer(start: channelData, count: frameCount))
        lastBufferTime = Date()  // Watchdog heartbeat

        lock.lock()
        if retainFullSessionAudio {
            let remainingCapacity = Self.maxRetainedSessionSamples - retainedSessionSamples.count
            if remainingCapacity > 0 {
                retainedSessionSamples.append(contentsOf: samples.prefix(remainingCapacity))
            }
            if samples.count > remainingCapacity {
                retainedSessionExceededLimit = true
            }
        }
        lock.unlock()

        let bufferDuration = Double(frameCount) / targetFormat.sampleRate

        // Calculate RMS energy for VAD
        var rms: Float = 0
        vDSP_rmsqv(channelData, 1, &rms, vDSP_Length(frameCount))

        // Debug: log every 100th buffer to avoid spam
        bufferLogCounter += 1
        if bufferLogCounter % 100 == 1 {
            logToFile("audio buffer #\(bufferLogCounter): rms=\(String(format: "%.4f", rms)) threshold=\(silenceThreshold) dur=\(String(format: "%.2f", accumulatedDuration))s voice=\(voiceDetected)")
        }

        let hasVoice = rms > silenceThreshold

        lock.lock()

        // Always accumulate audio (we need silence context too for Whisper)
        accumulatedSamples.append(contentsOf: samples)
        accumulatedDuration += bufferDuration

        if hasVoice {
            voiceDetected = true
            silenceDuration = 0  // Reset silence counter
        } else if voiceDetected {
            // Voice was active, now silence — count silence duration
            silenceDuration += bufferDuration
        }

        // Emit chunk when: user paused (silence after speech) OR max duration reached
        let shouldEmit: Bool
        if voiceDetected && silenceDuration >= silencePauseThreshold && accumulatedDuration >= minChunkDuration {
            // User paused speaking — emit the complete thought
            shouldEmit = true
        } else if accumulatedDuration >= maxChunkDuration {
            // Safety: force-emit very long continuous speech
            shouldEmit = true
        } else {
            shouldEmit = false
        }

        if shouldEmit {
            let chunk = accumulatedSamples
            accumulatedSamples.removeAll()
            accumulatedDuration = 0
            voiceDetected = false
            silenceDuration = 0
            lock.unlock()

            if !chunk.isEmpty {
                onChunkReady?(chunk)
            }
        } else {
            lock.unlock()
        }
    }

    private func convertToTarget(_ buffer: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
        guard let converter = audioConverter else { return nil }

        let ratio = targetFormat.sampleRate / buffer.format.sampleRate
        let outputFrameCount = AVAudioFrameCount(Double(buffer.frameLength) * ratio)

        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: max(outputFrameCount, 1)
        ) else { return nil }

        var error: NSError?
        var inputConsumed = false

        converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            if inputConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            inputConsumed = true
            outStatus.pointee = .haveData
            return buffer
        }

        if let error {
            logToFile("[AudioCapture] Conversion error: \(error)")
            return nil
        }

        return outputBuffer
    }
}

enum AudioError: LocalizedError {
    case noInputDevice
    case converterCreationFailed

    var errorDescription: String? {
        switch self {
        case .noInputDevice:
            return "No audio input device found. Check your microphone."
        case .converterCreationFailed:
            return "Failed to create audio format converter."
        }
    }
}
