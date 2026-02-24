import AVFoundation
import Accelerate

final class AudioCaptureService {
    private let audioEngine = AVAudioEngine()
    private var audioConverter: AVAudioConverter?
    private let targetFormat: AVAudioFormat

    // Accumulation
    private var accumulatedSamples: [Float] = []
    private var accumulatedDuration: TimeInterval = 0
    private let lock = NSLock()

    // VAD
    private var voiceDetected = false

    // Callback
    private var onChunkReady: (([Float]) -> Void)?

    init() {
        // WhisperKit requires: 16000 Hz, 1 channel, Float32
        targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16000,
            channels: 1,
            interleaved: false
        )!
    }

    func startRecording(
        chunkDuration: Double,
        silenceThreshold: Float,
        onChunkReady: @escaping ([Float]) -> Void
    ) throws {
        self.onChunkReady = onChunkReady
        accumulatedSamples.removeAll()
        accumulatedDuration = 0
        voiceDetected = false

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
    }

    /// Stop recording and return any remaining accumulated audio
    func stopRecording() -> [Float]? {
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

        // Calculate RMS energy for VAD
        var rms: Float = 0
        vDSP_rmsqv(channelData, 1, &rms, vDSP_Length(frameCount))

        let hasVoice = rms > silenceThreshold

        lock.lock()

        if hasVoice {
            voiceDetected = true
        }

        // Only accumulate if voice detected
        if voiceDetected {
            accumulatedSamples.append(contentsOf: samples)
            accumulatedDuration += Double(frameCount) / targetFormat.sampleRate
        }

        // Emit chunk when duration reached
        if accumulatedDuration >= chunkDuration {
            let chunk = accumulatedSamples
            accumulatedSamples.removeAll()
            accumulatedDuration = 0
            voiceDetected = false
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
