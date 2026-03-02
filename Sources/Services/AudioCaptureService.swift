import AVFoundation
import Accelerate
import CoreAudio

final class AudioCaptureService {
    private var audioEngine = AVAudioEngine()
    private var audioConverter: AVAudioConverter?
    private let targetFormat: AVAudioFormat

    // Accumulation
    private var accumulatedSamples: [Float] = []
    private var accumulatedDuration: TimeInterval = 0
    private let lock = NSLock()

    // Smart VAD — pause detection
    private var voiceDetected = false
    private var silenceDuration: TimeInterval = 0
    private let silencePauseThreshold: TimeInterval = 0.2  // 200ms silence = user paused (faster response)
    private let minChunkDuration: TimeInterval = 0.3       // Don't emit chunks shorter than 0.3s
    private let maxChunkDuration: TimeInterval = 6.0       // Force-emit after 6s (was 15s — reduces delay)

    // Callback
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

    /// Stop recording and return any remaining accumulated audio
    func stopRecording() -> [Float]? {
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

    // MARK: - Private

    private func processBuffer(
        _ buffer: AVAudioPCMBuffer,
        chunkDuration: Double,
        silenceThreshold: Float
    ) {
        // Convert to 16kHz mono
        guard let converted = convertToTarget(buffer) else { return }
        guard let channelData = converted.floatChannelData?[0] else { return }

        let frameCount = Int(converted.frameLength)
        let samples = Array(UnsafeBufferPointer(start: channelData, count: frameCount))
        let bufferDuration = Double(frameCount) / targetFormat.sampleRate
        lastBufferTime = Date()  // Watchdog heartbeat

        // Calculate RMS energy for VAD
        var rms: Float = 0
        vDSP_rmsqv(channelData, 1, &rms, vDSP_Length(frameCount))

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
