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

struct TranscriptionEntry: Identifiable, Codable {
    let id: UUID
    let originalText: String
    let cleanedText: String
    let timestamp: Date

    init(originalText: String, cleanedText: String, timestamp: Date = Date()) {
        self.id = UUID()
        self.originalText = originalText
        self.cleanedText = cleanedText
        self.timestamp = timestamp
    }

    /// Backward-compatible accessor
    var text: String { cleanedText }
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

    // Scratch-that tracking (non-persisted, per session)
    var recentOutputLengths: [Int] = []
    var sessionTotalChars: Int = 0

    // Settings (persisted via UserDefaults)
    var selectedModel: WhisperModelSize {
        get {
            let model = WhisperModelSize(rawValue: UserDefaults.standard.string(forKey: "selectedModel") ?? "small") ?? .small
            let devConfigExists = FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
                || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
            if devConfigExists { return model }
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

    // MARK: - LLM Provider Settings

    var selectedLLMProvider: LLMProvider {
        get { LLMProvider(rawValue: UserDefaults.standard.string(forKey: "selectedLLMProvider") ?? "groq") ?? .groq }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "selectedLLMProvider") }
    }

    var groqApiKey: String {
        get { readEnvKey("GROQ_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "groqApiKey") }
    }
    var openRouterApiKey: String {
        get { readEnvKey("OPENROUTER_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "openRouterApiKey") }
    }
    var claudeApiKey: String {
        get { readEnvKey("ANTHROPIC_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "claudeApiKey") }
    }
    var openAIApiKey: String {
        get { readEnvKey("OPENAI_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "openAIApiKey") }
    }
    var geminiApiKey: String {
        get { readEnvKey("GEMINI_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "geminiApiKey") }
    }
    var moonshotApiKey: String {
        get { readEnvKey("MOONSHOT_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "moonshotApiKey") }
    }
    var deepSeekApiKey: String {
        get { readEnvKey("DEEPSEEK_API_KEY") }
        set { UserDefaults.standard.set(newValue, forKey: "deepSeekApiKey") }
    }

    var customStyleInstructions: String {
        get { UserDefaults.standard.string(forKey: "customStyleInstructions") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "customStyleInstructions") }
    }

    var smartPunctuationEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "smartPunctuationEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "smartPunctuationEnabled") }
    }

    var scratchThatEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "scratchThatEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "scratchThatEnabled") }
    }

    // MARK: - License & Usage Tracking

    var licenseKey: String {
        get { UserDefaults.standard.string(forKey: "licenseKey") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "licenseKey") }
    }

    var isPro: Bool {
        get { UserDefaults.standard.bool(forKey: "isPro") }
        set { UserDefaults.standard.set(newValue, forKey: "isPro") }
    }

    var minutesTranscribedToday: Double {
        get { UserDefaults.standard.double(forKey: "minutesTranscribedToday") }
        set { UserDefaults.standard.set(newValue, forKey: "minutesTranscribedToday") }
    }

    var llmCleanupsToday: Int {
        get { UserDefaults.standard.integer(forKey: "llmCleanupsToday") }
        set { UserDefaults.standard.set(newValue, forKey: "llmCleanupsToday") }
    }

    private var lastUsageResetDate: String {
        get { UserDefaults.standard.string(forKey: "lastUsageResetDate") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "lastUsageResetDate") }
    }

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
        let devConfigExists = FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
            || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
        if devConfigExists { return true }
        return isPro || llmCleanupsToday < FreeTierLimits.llmCleanupsPerDay
    }

    var availableModels: [WhisperModelSize] {
        if isPro { return WhisperModelSize.allCases }
        return WhisperModelSize.allCases.filter { $0.isFree }
    }

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

    func trackTranscriptionTime(seconds: Double) {
        minutesTranscribedToday += seconds / 60.0
    }

    // MARK: - API Key Helpers

    func apiKeyForProvider(_ provider: LLMProvider) -> String {
        switch provider {
        case .groq: return groqApiKey
        case .openRouter: return openRouterApiKey
        case .claude: return claudeApiKey
        case .openAI: return openAIApiKey
        case .gemini: return geminiApiKey
        case .moonshot: return moonshotApiKey
        case .deepSeek: return deepSeekApiKey
        }
    }

    func allAPIKeys() -> [LLMProvider: String] {
        Dictionary(uniqueKeysWithValues: LLMProvider.allCases.map { ($0, apiKeyForProvider($0)) })
    }

    var hasAnyLLMKey: Bool {
        LLMProvider.allCases.contains { !apiKeyForProvider($0).isEmpty }
    }

    private func readEnvKey(_ envName: String) -> String {
        let udKeyMap: [String: String] = [
            "GROQ_API_KEY": "groqApiKey",
            "OPENROUTER_API_KEY": "openRouterApiKey",
            "ANTHROPIC_API_KEY": "claudeApiKey",
            "OPENAI_API_KEY": "openAIApiKey",
            "GEMINI_API_KEY": "geminiApiKey",
            "MOONSHOT_API_KEY": "moonshotApiKey",
            "DEEPSEEK_API_KEY": "deepSeekApiKey",
        ]
        let udKey = udKeyMap[envName] ?? envName
        if let key = UserDefaults.standard.string(forKey: udKey), !key.isEmpty {
            return key
        }
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

    // MARK: - History Persistence

    func loadHistory() {
        guard let data = UserDefaults.standard.data(forKey: "transcriptionHistory"),
              let entries = try? JSONDecoder().decode([TranscriptionEntry].self, from: data)
        else { return }
        transcriptionHistory = entries
    }

    func saveHistory() {
        let limited = Array(transcriptionHistory.prefix(100))
        if let data = try? JSONEncoder().encode(limited) {
            UserDefaults.standard.set(data, forKey: "transcriptionHistory")
        }
    }

    func clearHistory() {
        transcriptionHistory.removeAll()
        UserDefaults.standard.removeObject(forKey: "transcriptionHistory")
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

    var showUpgradePrompt = false

    // MARK: - Lifecycle

    private var isDevMode: Bool {
        FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
            || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
    }

    func setup() async {
        logToFile("setup() entered")

        // Auto-enable Pro for developer (has .env config)
        if isDevMode {
            isPro = true
            logToFile("Dev mode detected — Pro auto-enabled")
        }

        resetDailyUsageIfNeeded()
        loadHistory()

        if PermissionService.microphoneStatus() == .notDetermined {
            _ = await PermissionService.requestMicrophonePermission()
        }
        logToFile("Mic permission checked")

        transcriptionService = TranscriptionService()
        audioService = AudioCaptureService()
        autoTypeService = AutoTypeService()
        llmCleanupService = LLMCleanupService()
        licenseService = LicenseService()

        if !licenseKey.isEmpty {
            let valid = await licenseService?.validate(licenseKey) ?? false
            await MainActor.run { isPro = valid }
            logToFile("License validation: \(valid ? "Pro" : "Invalid")")
        }

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

            hotkeyService?.register { [weak self] in
                Task { @MainActor in
                    self?.toggleRecording()
                }
            }

            if !AXIsProcessTrusted() {
                logToFile("Accessibility not granted — prompting user")
                AutoTypeService.promptAccessibilityOnce()
            } else {
                logToFile("Accessibility granted")
            }
        }
        logToFile("Services initialized, hotkey registered")

        await waitForNetwork()

        do {
            await loadModel()
            logToFile("Model load complete")
        }
    }

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
                    let delay = Double(attempt) * 5.0
                    logToFile("Retrying model load in \(Int(delay))s...")
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
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

        // Reset scratch-that tracking for new session
        recentOutputLengths.removeAll()
        sessionTotalChars = 0

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
            print("[IndianWhisper] Recording error: \(error)")
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
        resetDailyUsageIfNeeded()

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

        let chunkSeconds = Double(samples.count) / 16000.0
        trackTranscriptionTime(seconds: chunkSeconds)

        do {
            let text = try await transcriptionService?.transcribe(
                audioSamples: samples,
                language: language
            ) ?? ""

            let trimmed = text.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            let lower = trimmed.lowercased()

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

            // Skip noise/sound descriptions
            if lower.hasPrefix("(") && lower.hasSuffix(")") {
                await MainActor.run { isProcessing = false }
                return
            }
            if lower.hasPrefix("[") && lower.hasSuffix("]") {
                await MainActor.run { isProcessing = false }
                return
            }
            if lower.hasPrefix("*") && lower.hasSuffix("*") {
                await MainActor.run { isProcessing = false }
                return
            }

            // FEATURE 5: Voice command detection (BEFORE LLM cleanup)
            if scratchThatEnabled {
                let command = VoiceCommandService.detect(trimmed)
                switch command {
                case .scratchThat:
                    await MainActor.run {
                        if let lastLength = recentOutputLengths.popLast() {
                            autoTypeService?.deleteCharacters(lastLength)
                            sessionTotalChars -= lastLength
                            logToFile("SCRATCH THAT: deleted \(lastLength) chars")
                        }
                        isProcessing = false
                    }
                    return

                case .deleteWord:
                    await MainActor.run {
                        autoTypeService?.deleteLastWord()
                        logToFile("DELETE WORD")
                        isProcessing = false
                    }
                    return

                case .clearAll:
                    await MainActor.run {
                        if sessionTotalChars > 0 {
                            autoTypeService?.deleteCharacters(sessionTotalChars)
                            logToFile("CLEAR ALL: deleted \(sessionTotalChars) chars")
                            sessionTotalChars = 0
                            recentOutputLengths.removeAll()
                        }
                        isProcessing = false
                    }
                    return

                case .none:
                    break
                }
            }

            // Save raw text for history
            let rawWhisperText = trimmed

            // FEATURE 2: LLM cleanup with selected provider + FEATURE 1: custom instructions
            let wordCount = trimmed.split(separator: " ").count
            logToFile("LLM gate: enabled=\(llmCleanupEnabled) hasKey=\(hasAnyLLMKey) canUse=\(canUseLLMCleanup) words=\(wordCount) cleanups=\(llmCleanupsToday)")
            let llmOutput: String
            if llmCleanupEnabled && hasAnyLLMKey && canUseLLMCleanup && wordCount >= 3 {
                llmCleanupsToday += 1
                let cleaned = await llmCleanupService?.cleanWithProvider(
                    trimmed,
                    provider: selectedLLMProvider,
                    apiKeys: allAPIKeys(),
                    customInstructions: customStyleInstructions
                ) ?? trimmed
                if cleaned.isEmpty {
                    await MainActor.run { isProcessing = false }
                    return
                }
                llmOutput = cleaned
            } else {
                llmOutput = trimmed
            }

            // FEATURE 4: Smart punctuation (AFTER LLM cleanup)
            let finalText: String
            if smartPunctuationEnabled {
                finalText = SmartPunctuationService.apply(llmOutput)
            } else {
                finalText = llmOutput
            }

            await MainActor.run {
                lastTranscription = finalText

                // FEATURE 3: History with original + cleaned text
                transcriptionHistory.insert(
                    TranscriptionEntry(originalText: rawWhisperText, cleanedText: finalText),
                    at: 0
                )
                if transcriptionHistory.count > 100 {
                    transcriptionHistory = Array(transcriptionHistory.prefix(100))
                }
                saveHistory()

                // Auto-type + FEATURE 5: track char count
                if autoTypeEnabled {
                    let textToType = finalText + " "
                    autoTypeService?.typeText(textToType)
                    recentOutputLengths.append(textToType.count)
                    sessionTotalChars += textToType.count
                    if recentOutputLengths.count > 20 {
                        recentOutputLengths.removeFirst()
                    }
                }

                isProcessing = false
                if isRecording {
                    floatingIndicator?.update(isRecording: true, isProcessing: false)
                } else {
                    floatingIndicator?.hide()
                }
            }
        } catch {
            print("[IndianWhisper] Transcription error: \(error)")
            await MainActor.run {
                isProcessing = false
                if !isRecording { floatingIndicator?.hide() }
            }
        }
    }
}
