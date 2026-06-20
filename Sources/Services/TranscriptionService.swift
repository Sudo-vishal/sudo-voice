import WhisperKit
import Foundation

final class TranscriptionService {
    private var whisperKit: WhisperKit?

    /// Load a Whisper model with REAL download progress.
    ///
    /// Previously this passed `download: true` to WhisperKitConfig, which
    /// downloads silently — the onProgress callback was never invoked, so the
    /// UI froze at "0%" for the entire (often multi-minute) download. New users
    /// on slow connections assumed it was dead and quit. Now we download
    /// explicitly via WhisperKit.download(...), which reports real fractional
    /// progress, THEN load the model from the resolved local folder.
    func loadModel(
        _ model: WhisperModelSize,
        onProgress: @escaping (Double) -> Void
    ) async throws {
        // Release previous model
        whisperKit = nil

        let modelName = "openai_whisper-\(model.rawValue)"
        logToFile("Loading model \(modelName) — starting download/verify")

        // Step 1: download (or verify cached) with live progress.
        // If already on disk, this returns near-instantly at 100%.
        let modelFolder = try await WhisperKit.download(
            variant: modelName,
            from: "argmaxinc/whisperkit-coreml",
            progressCallback: { progress in
                onProgress(progress.fractionCompleted)
            }
        )
        onProgress(1.0)
        logToFile("Model \(modelName) ready at \(modelFolder.path) — initializing")

        // Step 2: load from the resolved local folder (no second download).
        let config = WhisperKitConfig(
            model: modelName,
            modelFolder: modelFolder.path,
            verbose: true,
            logLevel: .info,
            prewarm: true,
            load: true,
            download: false
        )

        whisperKit = try await WhisperKit(config)
        logToFile("WhisperKit initialized successfully (\(modelName))")
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
