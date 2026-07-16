import WhisperKit
import Foundation

final class TranscriptionService {
    private var whisperKit: WhisperKit?
    var hasLoadedModel: Bool { whisperKit != nil }

    /// Model storage — ~/Library/Application Support/IndianWhisper/models.
    /// WhisperKit's default is ~/Documents/huggingface, which triggers macOS's
    /// scary "would like to access files in your Documents folder" consent
    /// dialog on first run. App Support needs no permission dialog at all.
    /// Existing installs are migrated silently (move, not re-download).
    static let modelBase: URL = {
        let fm = FileManager.default
        let base = fm.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/IndianWhisper/models", isDirectory: true)
        try? fm.createDirectory(at: base, withIntermediateDirectories: true)

        // One-time migration from the old Documents location
        let legacy = fm.homeDirectoryForCurrentUser
            .appendingPathComponent("Documents/huggingface", isDirectory: true)
        let migrated = base.appendingPathComponent("huggingface", isDirectory: true)
        if fm.fileExists(atPath: legacy.path), !fm.fileExists(atPath: migrated.path) {
            do {
                try fm.moveItem(at: legacy, to: migrated)
                logToFile("Migrated Whisper models: Documents/huggingface → App Support")
            } catch {
                logToFile("Model migration failed (will re-download to App Support): \(error)")
            }
        }
        return base
    }()

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
        let localFolder = Self.localModelFolder(for: modelName)
        let modelFolder: URL

        if Self.isValidModelFolder(localFolder) {
            logToFile("Model \(modelName) found on disk — loading offline")
            modelFolder = localFolder
        } else {
            logToFile("Loading model \(modelName) — starting download/verify")
            do {
                modelFolder = try await WhisperKit.download(
                    variant: modelName,
                    downloadBase: Self.modelBase,
                    from: "argmaxinc/whisperkit-coreml",
                    progressCallback: { progress in
                        onProgress(progress.fractionCompleted)
                    }
                )
            } catch {
                guard FileManager.default.fileExists(atPath: localFolder.path) else {
                    throw error
                }
                logToFile("Model \(modelName) download failed — attempting best-effort offline load: \(error)")
                modelFolder = localFolder
            }
        }
        onProgress(1.0)
        logToFile("Model \(modelName) ready at \(modelFolder.path) — initializing")

        // Step 2: load from the resolved local folder (no second download).
        // downloadBase also steers the tokenizer cache away from ~/Documents.
        let config = WhisperKitConfig(
            model: modelName,
            downloadBase: Self.modelBase,
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
        return Self.isValidModelFolder(Self.localModelFolder(for: modelName))
    }

    private static func localModelFolder(for modelName: String) -> URL {
        modelBase.appendingPathComponent(
            "huggingface/models/argmaxinc/whisperkit-coreml/\(modelName)",
            isDirectory: true
        )
    }

    private static func isValidModelFolder(_ folder: URL) -> Bool {
        let requiredPaths = [
            "config.json",
            "AudioEncoder.mlmodelc",
            "MelSpectrogram.mlmodelc",
            "TextDecoder.mlmodelc"
        ]
        return requiredPaths.allSatisfy {
            FileManager.default.fileExists(atPath: folder.appendingPathComponent($0).path)
        }
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
