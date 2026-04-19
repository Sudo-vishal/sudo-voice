import WhisperKit
import Foundation

final class TranscriptionService {
    private var whisperKit: WhisperKit?

    /// Load a Whisper model. Let WhisperKit handle caching + download.
    func loadModel(
        _ model: WhisperModelSize,
        onProgress: @escaping (Double) -> Void
    ) async throws {
        // Release previous model
        whisperKit = nil

        let modelName = "openai_whisper-\(model.rawValue)"
        logToFile("Initializing WhisperKit with model: \(modelName)")

        let config = WhisperKitConfig(
            model: modelName,
            verbose: true,
            logLevel: .info,
            prewarm: true,
            load: true,
            download: true
        )

        whisperKit = try await WhisperKit(config)
        logToFile("WhisperKit initialized successfully")
    }

    /// Transcribe audio samples (16kHz mono Float32)
    func transcribe(
        audioSamples: [Float],
        language: String
    ) async throws -> String {
        guard let whisperKit else {
            throw TranscriptionError.modelNotLoaded
        }

        let options = DecodingOptions(
            task: .transcribe,
            language: language,
            temperature: 0.0,
            usePrefillPrompt: true,
            usePrefillCache: true,
            skipSpecialTokens: true,
            withoutTimestamps: true,
            wordTimestamps: false,
            suppressBlank: true
        )

        let results = try await whisperKit.transcribe(
            audioArray: audioSamples,
            decodeOptions: options
        )

        let text = results
            .compactMap { $0.text }
            .joined(separator: " ")
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)

        return text
    }

    /// Check if a model is downloaded locally
    func isModelDownloaded(_ model: WhisperModelSize) -> Bool {
        let modelName = "openai_whisper-\(model.rawValue)"
        let localPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Documents/huggingface/models/argmaxinc/whisperkit-coreml/\(modelName)")
        return FileManager.default.fileExists(atPath: localPath.path)
    }
}

enum TranscriptionError: LocalizedError {
    case modelNotLoaded

    var errorDescription: String? {
        switch self {
        case .modelNotLoaded:
            return "Whisper model not loaded. Please wait for download to complete."
        }
    }
}
