import Foundation
import SwiftUI
import Network

// MARK: - Model Size

enum WhisperModelSize: String, CaseIterable, Identifiable {
    case tiny = "tiny"
    case base = "base"
    case small = "small"
    case largeTurbo = "large-v3_turbo"
    case large = "large-v3"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .tiny: return "Tiny (~75 MB)"
        case .base: return "Base (~140 MB)"
        case .small: return "Small (~460 MB)"
        case .largeTurbo: return "Large V3 Turbo (~1.5 GB)"
        case .large: return "Large V3 (~3 GB)"
        }
    }

    /// Whether this model is available on the free tier
    var isFree: Bool {
        switch self {
        case .tiny, .base: return true
        case .small, .largeTurbo, .large: return false
        }
    }
}

// MARK: - Free Tier Limits

enum FreeTierLimits {
    static let minutesPerDay: Double = 30.0
    static let llmCleanupsPerDay: Int = 20
    static let maxDevices: Int = 1
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
        get {
            let model = WhisperModelSize(rawValue: UserDefaults.standard.string(forKey: "selectedModel") ?? "small") ?? .small
            // Dev mode: skip free-tier model gating (check for .env = dev machine)
            let devConfigExists = FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
                || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
            if devConfigExists { return model }
            // Downgrade to base if free user has pro model selected
            if !isPro && !model.isFree { return .base }
            return model
        }
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
            return val > 0 ? val : 2.0
        }
        set { UserDefaults.standard.set(newValue, forKey: "chunkDuration") }
    }
    var silenceThreshold: Float {
        get {
            let val = UserDefaults.standard.float(forKey: "silenceThreshold")
            return val > 0 ? val : 0.04
        }
        set { UserDefaults.standard.set(newValue, forKey: "silenceThreshold") }
    }
    var llmCleanupEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "llmCleanupEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "llmCleanupEnabled") }
    }
    var openRouterApiKey: String {
        get { readEnvKey("OPENROUTER_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "openRouterApiKey") }
    }
    var groqApiKey: String {
        get { readEnvKey("GROQ_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "groqApiKey") }
    }

    // MARK: - License & Usage Tracking

    var licenseKey: String {
        get { UserDefaults.standard.string(forKey: "licenseKey") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "licenseKey") }
    }

    /// Pro status — validated by LicenseService
    var isPro: Bool {
        get { UserDefaults.standard.bool(forKey: "isPro") }
        set { UserDefaults.standard.set(newValue, forKey: "isPro") }
    }

    /// Minutes transcribed today (resets daily)
    var minutesTranscribedToday: Double {
        get { UserDefaults.standard.double(forKey: "minutesTranscribedToday") }
        set { UserDefaults.standard.set(newValue, forKey: "minutesTranscribedToday") }
    }

    /// LLM cleanups used today (resets daily)
    var llmCleanupsToday: Int {
        get { UserDefaults.standard.integer(forKey: "llmCleanupsToday") }
        set { UserDefaults.standard.set(newValue, forKey: "llmCleanupsToday") }
    }

    /// Date string for daily reset tracking (yyyy-MM-dd)
    private var lastUsageResetDate: String {
        get { UserDefaults.standard.string(forKey: "lastUsageResetDate") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "lastUsageResetDate") }
    }

    /// Whether onboarding has been completed
    var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") }
        set { UserDefaults.standard.set(newValue, forKey: "hasCompletedOnboarding") }
    }

    // MARK: - Free Tier Computed Properties

    var isFreeTierExhausted: Bool {
        !isPro && minutesTranscribedToday >= FreeTierLimits.minutesPerDay
    }

    var freeMinutesRemaining: Double {
        isPro ? .infinity : max(0, FreeTierLimits.minutesPerDay - minutesTranscribedToday)
    }

    var freeLLMCleanupsRemaining: Int {
        isPro ? .max : max(0, FreeTierLimits.llmCleanupsPerDay - llmCleanupsToday)
    }

    var canUseLLMCleanup: Bool {
        // Dev mode: unlimited LLM cleanups
        let devConfigExists = FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
            || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
        if devConfigExists { return true }
        return isPro || llmCleanupsToday < FreeTierLimits.llmCleanupsPerDay
    }

    /// Models available based on license status
    var availableModels: [WhisperModelSize] {
        if isPro { return WhisperModelSize.allCases }
        return WhisperModelSize.allCases.filter { $0.isFree }
    }

    /// Reset daily counters if date changed
    func resetDailyUsageIfNeeded() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        if lastUsageResetDate != today {
            minutesTranscribedToday = 0
            llmCleanupsToday = 0
            lastUsageResetDate = today
            logToFile("Daily usage reset for \(today)")
        }
    }

    /// Track transcription time (call after each chunk)
    func trackTranscriptionTime(seconds: Double) {
        minutesTranscribedToday += seconds / 60.0
    }

    /// Read API key from UserDefaults first, then .env file
    private func readEnvKey(_ envName: String) -> String {
        let udKey = envName == "GROQ_API_KEY" ? "groqApiKey" : "openRouterApiKey"
        if let key = UserDefaults.standard.string(forKey: udKey), !key.isEmpty {
            return key
        }
        // Check both new and legacy config paths
        let configDir = FileManager.default.homeDirectoryForCurrentUser
        let envPath = configDir.appendingPathComponent(".config/indianwhisper/.env").path
        let legacyPath = configDir.appendingPathComponent(".config/whisper-aiwithdhruv/.env").path
        let actualPath = FileManager.default.fileExists(atPath: envPath) ? envPath : legacyPath
        if let contents = try? String(contentsOfFile: actualPath, encoding: .utf8) {
            for line in contents.components(separatedBy: .newlines) {
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                if trimmed.hasPrefix("\(envName)=") {
                    return String(trimmed.dropFirst("\(envName)=".count))
                }
            }
        }
        return ""
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
        if let hotkey = hotkeyService?.displayString {
            return "Ready — \(hotkey) to start"
        }
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
    var llmCleanupService: LLMCleanupService?
    var licenseService: LicenseService?

    /// Show upgrade prompt when free tier is exhausted
    var showUpgradePrompt = false

    // MARK: - Lifecycle

    func setup() async {
        logToFile("setup() entered")

        // Reset daily usage counters if date changed
        resetDailyUsageIfNeeded()

        // Request mic permission
        if PermissionService.microphoneStatus() == .notDetermined {
            _ = await PermissionService.requestMicrophonePermission()
        }
        logToFile("Mic permission checked")

        // Init services (UI-related ones MUST be on main thread)
        transcriptionService = TranscriptionService()
        audioService = AudioCaptureService()
        autoTypeService = AutoTypeService()
        llmCleanupService = LLMCleanupService()
        licenseService = LicenseService()

        // Validate license on startup
        if !licenseKey.isEmpty {
            let valid = await licenseService?.validate(licenseKey) ?? false
            await MainActor.run { isPro = valid }
            logToFile("License validation: \(valid ? "Pro" : "Invalid")")
        }

        // Auto-reconnect mic when audio device changes
        audioService?.onDeviceChanged = { [weak self] in
            guard let self, self.isRecording else { return }
            logToFile("Device changed while recording — attempting reconnect")
            do {
                try self.audioService?.reconnect()
                logToFile("Mic reconnected successfully")
            } catch {
                logToFile("Mic reconnect failed: \(error) — stopping recording")
                Task { @MainActor in self.stopRecording() }
            }
        }

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

        // Wait for network before loading model (WhisperKit needs connectivity for cache verification)
        await waitForNetwork()

        // Load model
        do {
            await loadModel()
            logToFile("Model load complete")
        }
    }

    /// Wait for network connectivity (max ~30s) before proceeding
    private func waitForNetwork() async {
        let monitor = NWPathMonitor()
        let queue = DispatchQueue(label: "network-check")

        let hasNetwork = await withCheckedContinuation { continuation in
            var resumed = false
            monitor.pathUpdateHandler = { path in
                guard !resumed else { return }
                if path.status == .satisfied {
                    resumed = true
                    monitor.cancel()
                    continuation.resume(returning: true)
                }
            }
            monitor.start(queue: queue)

            // Timeout after 30 seconds — proceed anyway (model may be cached)
            DispatchQueue.global().asyncAfter(deadline: .now() + 30) {
                guard !resumed else { return }
                resumed = true
                monitor.cancel()
                continuation.resume(returning: false)
            }
        }

        if hasNetwork {
            logToFile("Network available — proceeding with model load")
        } else {
            logToFile("Network timeout (30s) — proceeding anyway (model may be cached)")
        }
    }

    func loadModel() async {
        logToFile("Loading model: \(selectedModel.rawValue) (isPro=\(isPro))")
        await MainActor.run {
            isModelDownloading = true
            isModelLoaded = false
        }

        // Retry up to 3 times with exponential backoff
        let maxRetries = 3
        for attempt in 1...maxRetries {
            do {
                try await transcriptionService?.loadModel(selectedModel) { [weak self] progress in
                    Task { @MainActor in
                        self?.modelDownloadProgress = progress
                    }
                }
                await MainActor.run {
                    isModelLoaded = true
                }
                logToFile("Model loaded successfully (attempt \(attempt))")
                break
            } catch {
                logToFile("MODEL LOAD ERROR (attempt \(attempt)/\(maxRetries)): \(error)")
                if attempt < maxRetries {
                    let delay = Double(attempt) * 5.0  // 5s, 10s, 15s
                    logToFile("Retrying model load in \(Int(delay))s...")
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    // Re-check network before retry
                    await waitForNetwork()
                }
            }
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
        // Reset daily counters if needed
        resetDailyUsageIfNeeded()

        // Free tier gate: check if daily limit exhausted
        if isFreeTierExhausted {
            await MainActor.run {
                showUpgradePrompt = true
                logToFile("Free tier exhausted (\(minutesTranscribedToday)m used). Stopping.")
                stopRecording()
            }
            return
        }

        let showIndicator = await MainActor.run { isRecording }

        await MainActor.run {
            isProcessing = true
            if showIndicator {
                floatingIndicator?.update(isRecording: true, isProcessing: true)
            }
        }

        // Track transcription time (samples at 16kHz)
        let chunkSeconds = Double(samples.count) / 16000.0
        trackTranscriptionTime(seconds: chunkSeconds)

        do {
            let text = try await transcriptionService?.transcribe(
                audioSamples: samples,
                language: language
            ) ?? ""

            // Filter out Whisper hallucinations and noise descriptions
            let trimmed = text.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            let lower = trimmed.lowercased()

            // Skip empty
            guard !trimmed.isEmpty else {
                await MainActor.run { isProcessing = false }
                return
            }

            // Known hallucination phrases
            let hallucinations: Set<String> = [
                ".", "..", "...", "thank you.", "thanks for watching!",
                "thank you for watching!", "bye.", "bye!", "you",
                "thanks.", "thank you", "thanks for watching.",
                "subscribe", "like and subscribe", "mm.", "hmm.",
                "mm", "hmm", "uh", "um", "ah", "oh",
            ]
            if hallucinations.contains(lower) {
                await MainActor.run { isProcessing = false }
                return
            }

            // Skip noise/sound descriptions like (dog barking), [BLANK_AUDIO], (coughing), etc.
            if lower.hasPrefix("(") && lower.hasSuffix(")") {
                await MainActor.run { isProcessing = false }
                return
            }
            if lower.hasPrefix("[") && lower.hasSuffix("]") {
                await MainActor.run { isProcessing = false }
                return
            }
            // Also catch "* sound *" patterns
            if lower.hasPrefix("*") && lower.hasSuffix("*") {
                await MainActor.run { isProcessing = false }
                return
            }

            // LLM cleanup: send raw Whisper text through Groq for polish
            // Skip LLM for very short outputs (1-2 words) — not worth the latency
            let wordCount = trimmed.split(separator: " ").count
            let groqOk = !groqApiKey.isEmpty
            let orOk = !openRouterApiKey.isEmpty
            logToFile("LLM gate: enabled=\(llmCleanupEnabled) groq=\(groqOk) or=\(orOk) canUse=\(canUseLLMCleanup) words=\(wordCount) cleanups=\(llmCleanupsToday)")
            let outputText: String
            if llmCleanupEnabled && (groqOk || orOk) && canUseLLMCleanup && wordCount >= 3 {
                llmCleanupsToday += 1
                let cleaned = await llmCleanupService?.cleanWithFailover(trimmed, groqKey: groqApiKey, openRouterKey: openRouterApiKey) ?? trimmed
                if cleaned.isEmpty {
                    // LLM said [SKIP] — all noise/fillers
                    await MainActor.run { isProcessing = false }
                    return
                }
                outputText = cleaned
            } else {
                outputText = trimmed
            }

            await MainActor.run {
                lastTranscription = outputText

                transcriptionHistory.insert(
                    TranscriptionEntry(text: outputText, timestamp: Date()),
                    at: 0
                )

                // Keep last 50 entries
                if transcriptionHistory.count > 50 {
                    transcriptionHistory = Array(transcriptionHistory.prefix(50))
                }

                // Auto-type
                if autoTypeEnabled {
                    autoTypeService?.typeText(outputText + " ")
                }

                isProcessing = false
                // Only show indicator if still recording
                if isRecording {
                    floatingIndicator?.update(isRecording: true, isProcessing: false)
                } else {
                    floatingIndicator?.hide()
                }
            }
        } catch {
            print("[WhisperAiwithDhruv] Transcription error: \(error)")
            await MainActor.run {
                isProcessing = false
                if !isRecording { floatingIndicator?.hide() }
            }
        }
    }
}
