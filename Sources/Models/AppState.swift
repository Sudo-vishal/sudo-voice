import Foundation
import SwiftUI

// MARK: - Model Size

enum WhisperModelSize: String, CaseIterable, Identifiable {
    case tiny = "tiny"
    case base = "base"
    case small = "small"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .tiny: return "Tiny (~75 MB)"
        case .base: return "Base (~140 MB)"
        case .small: return "Small (~460 MB)"
        }
    }
}

// MARK: - Transcription Entry

struct TranscriptionEntry: Identifiable {
    let id = UUID()
    let text: String
    let timestamp: Date
}

// MARK: - App State

@Observable
final class AppState {
    // Recording
    var isRecording = false
    var isProcessing = false

    // Model
    var isModelLoaded = false
    var isModelDownloading = false
    var modelDownloadProgress: Double = 0.0

    // Transcription
    var lastTranscription = ""
    var transcriptionHistory: [TranscriptionEntry] = []

    // Settings (persisted via UserDefaults)
    var selectedModel: WhisperModelSize {
        get { WhisperModelSize(rawValue: UserDefaults.standard.string(forKey: "selectedModel") ?? "base") ?? .base }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "selectedModel") }
    }
    var hindiMode: Bool {
        get { UserDefaults.standard.bool(forKey: "hindiMode") }
        set { UserDefaults.standard.set(newValue, forKey: "hindiMode") }
    }
    var autoTypeEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "autoTypeEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "autoTypeEnabled") }
    }
    var chunkDuration: Double {
        get {
            let val = UserDefaults.standard.double(forKey: "chunkDuration")
            return val > 0 ? val : 3.0
        }
        set { UserDefaults.standard.set(newValue, forKey: "chunkDuration") }
    }
    var silenceThreshold: Float {
        get {
            let val = UserDefaults.standard.float(forKey: "silenceThreshold")
            return val > 0 ? val : 0.01
        }
        set { UserDefaults.standard.set(newValue, forKey: "silenceThreshold") }
    }

    // Computed
    var menuBarIconName: String {
        if isRecording { return "mic.fill" }
        if isProcessing { return "waveform" }
        return "mic"
    }

    var statusText: String {
        if isModelDownloading { return "Downloading model (\(Int(modelDownloadProgress * 100))%)..." }
        if !isModelLoaded { return "Loading model..." }
        if isRecording { return "Listening..." }
        if isProcessing { return "Transcribing..." }
        return "Ready — Cmd+D to start"
    }

    var language: String {
        hindiMode ? "hi" : "en"
    }

    // Services
    var audioService: AudioCaptureService?
    var transcriptionService: TranscriptionService?
    var autoTypeService: AutoTypeService?
    var hotkeyService: HotkeyService?
    var floatingIndicator: FloatingIndicatorController?

    // MARK: - Lifecycle

    func setup() async {
        logToFile("setup() entered")

        // Request mic permission
        if PermissionService.microphoneStatus() == .notDetermined {
            _ = await PermissionService.requestMicrophonePermission()
        }
        logToFile("Mic permission checked")

        // Init services (UI-related ones MUST be on main thread)
        transcriptionService = TranscriptionService()
        audioService = AudioCaptureService()
        autoTypeService = AutoTypeService()

        await MainActor.run {
            hotkeyService = HotkeyService()
            floatingIndicator = FloatingIndicatorController()

            // Register hotkey (Carbon API needs main thread)
            hotkeyService?.register { [weak self] in
                Task { @MainActor in
                    self?.toggleRecording()
                }
            }

            // One-time accessibility prompt on launch if not granted
            if !AXIsProcessTrusted() {
                logToFile("Accessibility not granted — prompting user")
                AutoTypeService.promptAccessibilityOnce()
            } else {
                logToFile("Accessibility granted")
            }
        }
        logToFile("Services initialized, hotkey registered")

        // Load model
        do {
            await loadModel()
            logToFile("Model load complete")
        }
    }

    func loadModel() async {
        await MainActor.run {
            isModelDownloading = true
            isModelLoaded = false
        }

        do {
            try await transcriptionService?.loadModel(selectedModel) { [weak self] progress in
                Task { @MainActor in
                    self?.modelDownloadProgress = progress
                }
            }
            await MainActor.run {
                isModelLoaded = true
            }
        } catch {
            logToFile("MODEL LOAD ERROR: \(error)")
        }

        await MainActor.run {
            isModelDownloading = false
        }
    }

    // MARK: - Recording

    @MainActor
    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }

    @MainActor
    func startRecording() {
        guard isModelLoaded else { return }
        isRecording = true
        floatingIndicator?.update(isRecording: true, isProcessing: false)

        do {
            try audioService?.startRecording(
                chunkDuration: chunkDuration,
                silenceThreshold: silenceThreshold
            ) { [weak self] samples in
                Task { [weak self] in
                    await self?.processChunk(samples)
                }
            }
        } catch {
            print("[WhisperAiwithDhruv] Recording error: \(error)")
            isRecording = false
        }
    }

    @MainActor
    func stopRecording() {
        isRecording = false
        floatingIndicator?.hide()

        if let remaining = audioService?.stopRecording() {
            Task {
                await processChunk(remaining)
            }
        }
    }

    // MARK: - Transcription Pipeline

    func processChunk(_ samples: [Float]) async {
        await MainActor.run {
            isProcessing = true
            floatingIndicator?.update(isRecording: isRecording, isProcessing: true)
        }

        do {
            let text = try await transcriptionService?.transcribe(
                audioSamples: samples,
                language: language
            ) ?? ""

            // Filter out Whisper hallucinations
            let hallucinations = ["", ".", "...", "Thank you.", "Thanks for watching!",
                                  "Thank you for watching!", "Bye.", "Bye!", "you"]
            guard !text.isEmpty, !hallucinations.contains(text) else {
                await MainActor.run { isProcessing = false }
                return
            }

            await MainActor.run {
                lastTranscription = text

                transcriptionHistory.insert(
                    TranscriptionEntry(text: text, timestamp: Date()),
                    at: 0
                )

                // Keep last 50 entries
                if transcriptionHistory.count > 50 {
                    transcriptionHistory = Array(transcriptionHistory.prefix(50))
                }

                // Auto-type
                if autoTypeEnabled {
                    autoTypeService?.typeText(text + " ")
                }

                isProcessing = false
                floatingIndicator?.update(isRecording: isRecording, isProcessing: false)
            }
        } catch {
            print("[WhisperAiwithDhruv] Transcription error: \(error)")
            await MainActor.run {
                isProcessing = false
                floatingIndicator?.update(isRecording: isRecording, isProcessing: false)
            }
        }
    }
}
