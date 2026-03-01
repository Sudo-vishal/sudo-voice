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
    private let silencePauseThreshold: TimeInterval = 0.3  // 300ms silence = user paused
    private let minChunkDuration: TimeInterval = 0.5       // Don't emit chunks shorter than 0.5s
    private let maxChunkDuration: TimeInterval = 15.0      // Force-emit after 15s (safety)

    // Callback
    private var onChunkReady: (([Float]) -> Void)?

    // Reconnection state
    private var lastChunkDuration: Double = 2.0
    private var lastSilenceThreshold: Float = 0.04
    private var isCurrentlyRecording = false

    // Device change listener
    var onDeviceChanged: (() -> Void)?
    private var deviceChangeListenerID: AudioObjectPropertyListenerBlock?

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
            logToFile("Audio device changed — triggering reconnect")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self?.onDeviceChanged?()
            }
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

    /// Restart recording with the same parameters after a device change
    func reconnect() throws {
        guard isCurrentlyRecording, let callback = onChunkReady else { return }
        logToFile("Reconnecting audio engine after device change...")

        // Stop old engine
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()

        // Create fresh engine (required after device change)
        audioEngine = AVAudioEngine()
        audioConverter = nil

        // Restart with saved parameters
        try startRecording(
            chunkDuration: lastChunkDuration,
            silenceThreshold: lastSilenceThreshold,
            onChunkReady: callback
        )
        logToFile("Audio engine reconnected successfully")
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

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
            throw AudioError.noInputDevice
        }

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
                logToFile("WATCHDOG: No audio buffers for \(Int(elapsed))s — auto-reconnecting")
                DispatchQueue.main.async {
                    self.onDeviceChanged?()  // Trigger reconnect
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
            print("[AudioCapture] Conversion error: \(error)")
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
