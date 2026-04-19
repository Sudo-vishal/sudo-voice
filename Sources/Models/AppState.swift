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

    /// Community Edition: all models are free
    var isFree: Bool { true }
}

// MARK: - Free Tier Limits (Community Edition: unlimited)

enum FreeTierLimits {
    static let minutesPerDay: Double = .infinity
    static let llmCleanupsPerDay: Int = .max
    static let maxDevices: Int = 999
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
            let model = WhisperModelSize(rawValue: UserDefaults.standard.string(forKey: "selectedModel") ?? "base") ?? .base
            let devConfigExists = FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/indianwhisper/.env")
                || FileManager.default.fileExists(atPath: NSHomeDirectory() + "/.config/whisper-aiwithdhruv/.env")
            if devConfigExists { return model }
            if !isPro && !model.isFree { return .base }
            return model
        }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "selectedModel") }
    }

    /// Cloud transcription via Gemini — better for Indian English, requires internet
    /// Community Edition: default OFF (local-first, no API key needed)
    var useCloudTranscription: Bool = {
        return UserDefaults.standard.object(forKey: "useCloudTranscription") as? Bool ?? false
    }() {
        didSet {
            UserDefaults.standard.set(useCloudTranscription, forKey: "useCloudTranscription")
            // When switching to local mode, load the Whisper model if not already loaded
            if !useCloudTranscription {
                Task { await loadModel() }
            }
            // When switching to cloud, mark ready immediately
            if useCloudTranscription && (!geminiApiKey.isEmpty || !openRouterApiKey.isEmpty) {
                isModelLoaded = true
            }
        }
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

    /// Custom vocabulary — words the user frequently uses (helps transcription accuracy)
    var customVocabulary: String {
        get { UserDefaults.standard.string(forKey: "customVocabulary") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "customVocabulary") }
    }

    var smartPunctuationEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "smartPunctuationEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "smartPunctuationEnabled") }
    }

    var scratchThatEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "scratchThatEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "scratchThatEnabled") }
    }

    /// Text shown on the floating capsule while recording. Defaults to the
    /// AIwithDhruv brand; any user can change it to their name in Settings.
    var listeningLabel: String {
        get {
            let stored = UserDefaults.standard.string(forKey: "listeningLabel") ?? ""
            return stored.isEmpty ? "AIwithDhruv" : stored
        }
        set { UserDefaults.standard.set(newValue, forKey: "listeningLabel") }
    }

    // MARK: - License & Usage Tracking

    var licenseKey: String {
        get { UserDefaults.standard.string(forKey: "licenseKey") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "licenseKey") }
    }

    /// Community Edition: Pro features unlocked for everyone
    var isPro: Bool {
        get { true }
        set { /* Community Edition — always Pro */ }
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
        if useCloudTranscription {
            if geminiApiKey.isEmpty && openRouterApiKey.isEmpty { return "Set API key in Settings" }
            if isRecording { return "Streaming (Cloud)..." }
            if isProcessing { return "Transcribing..." }
            if let hotkey = hotkeyService?.displayString {
                return "Ready (Cloud) — \(hotkey) to start"
            }
            return "Ready (Cloud) — Cmd+D to start"
        }
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
    var geminiTranscriptionService: GeminiTranscriptionService?
    var liveTranscriptionService: GeminiLiveTranscriptionService?
    var autoTypeService: AutoTypeService?
    var hotkeyService: HotkeyService?
    var floatingIndicator: FloatingIndicatorController?
    var llmCleanupService: LLMCleanupService?
    var licenseService: LicenseService?
    var updateService: UpdateService?

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
        geminiTranscriptionService = GeminiTranscriptionService()
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

        // If cloud mode, mark ready immediately (no model download needed)
        let hasCloudKey = !geminiApiKey.isEmpty || !openRouterApiKey.isEmpty
        logToFile("Cloud check: useCloud=\(useCloudTranscription) geminiKey=\(geminiApiKey.isEmpty ? "EMPTY" : "SET(\(geminiApiKey.prefix(8))...)") openRouterKey=\(openRouterApiKey.isEmpty ? "EMPTY" : "SET")")
        if useCloudTranscription && hasCloudKey {
            await MainActor.run {
                isModelLoaded = true
            }
            logToFile("Cloud transcription mode — ready (no local model needed)")
        } else {
            await waitForNetwork()
            await loadModel()
            logToFile("Model load complete")
        }

        logToFile("Setup done. Model loaded: \(isModelLoaded)")

        // Check for app updates (non-blocking)
        updateService = UpdateService.shared
        Task.detached {
            await UpdateService.shared.checkForUpdates()
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
        // Cloud mode doesn't need local model
        let hasCloudKey = !geminiApiKey.isEmpty || !openRouterApiKey.isEmpty
        guard isModelLoaded || (useCloudTranscription && hasCloudKey) else { return }

        isRecording = true
        if useCloudTranscription && hasCloudKey {
            isModelLoaded = true  // ensure UI shows ready
        }
        floatingIndicator?.update(isRecording: true, isProcessing: false)

        // Reset scratch-that tracking for new session
        recentOutputLengths.removeAll()
        sessionTotalChars = 0

        let isCloudMode = useCloudTranscription && hasCloudKey

        // Configure audio thresholds based on transcription mode
        audioService?.configureForCloudMode(isCloudMode)

        if isCloudMode {
            // STREAMING MODE: Gemini Live API via WebSocket
            let service = GeminiLiveTranscriptionService()
            liveTranscriptionService = service

            // Handle transcription text from Gemini Live
            service.onTranscription = { [weak self] text in
                Task { @MainActor [weak self] in
                    self?.handleLiveTranscription(text)
                }
            }

            // Connect to Gemini Live, then start audio streaming
            Task {
                do {
                    try await service.connect(
                        apiKey: geminiApiKey,
                        language: language,
                        customInstructions: customStyleInstructions
                    )

                    // Stream audio directly to Gemini Live (no VAD batching)
                    await MainActor.run {
                        audioService?.onAudioStream = { [weak service] samples in
                            service?.sendAudio(samples)
                        }
                    }

                    logToFile("Gemini Live streaming active")
                } catch {
                    logToFile("Gemini Live connect failed: \(error) — falling back to REST")
                    // Fallback: disable streaming, use normal chunk-based REST
                    await MainActor.run {
                        audioService?.onAudioStream = nil
                        liveTranscriptionService = nil
                    }
                }
            }
        } else {
            // LOCAL MODE: normal VAD chunking
            audioService?.onAudioStream = nil
            liveTranscriptionService = nil
        }

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

        // Disconnect Gemini Live streaming
        audioService?.onAudioStream = nil
        liveTranscriptionService?.disconnect()
        liveTranscriptionService = nil

        if let remaining = audioService?.stopRecording() {
            // Only process remaining chunk for local mode (no live service)
            if !useCloudTranscription || (geminiApiKey.isEmpty && openRouterApiKey.isEmpty) {
                Task {
                    await processChunk(remaining)
                }
            }
        }
    }

    // MARK: - Live Streaming Pipeline

    /// Handle text from Gemini Live WebSocket (already transcribed + cleaned)
    @MainActor
    private func handleLiveTranscription(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let lower = trimmed.lowercased()

        guard !trimmed.isEmpty else { return }

        // Hallucination filter
        let hallucinations: Set<String> = [
            ".", "..", "...", "thank you.", "thanks for watching!",
            "thank you for watching!", "bye.", "bye!", "you",
            "thanks.", "thank you", "thanks for watching.",
            "subscribe", "like and subscribe", "mm.", "hmm.",
            "mm", "hmm", "uh", "um", "ah", "oh",
        ]
        if hallucinations.contains(lower) { return }

        // Skip noise descriptions
        if (lower.hasPrefix("(") && lower.hasSuffix(")")) ||
           (lower.hasPrefix("[") && lower.hasSuffix("]")) ||
           (lower.hasPrefix("*") && lower.hasSuffix("*")) { return }

        // Voice command detection
        if scratchThatEnabled {
            let command = VoiceCommandService.detect(trimmed)
            switch command {
            case .scratchThat:
                if let lastLength = recentOutputLengths.popLast() {
                    autoTypeService?.deleteCharacters(lastLength)
                    sessionTotalChars -= lastLength
                    logToFile("SCRATCH THAT: deleted \(lastLength) chars")
                }
                return
            case .deleteWord:
                autoTypeService?.deleteLastWord()
                logToFile("DELETE WORD")
                return
            case .clearAll:
                if sessionTotalChars > 0 {
                    autoTypeService?.deleteCharacters(sessionTotalChars)
                    logToFile("CLEAR ALL: deleted \(sessionTotalChars) chars")
                    sessionTotalChars = 0
                    recentOutputLengths.removeAll()
                }
                return
            case .none:
                break
            }
        }

        // Smart punctuation
        let finalText = smartPunctuationEnabled ? SmartPunctuationService.apply(trimmed) : trimmed

        // Update state
        lastTranscription = finalText

        // History
        transcriptionHistory.insert(
            TranscriptionEntry(originalText: trimmed, cleanedText: finalText),
            at: 0
        )
        if transcriptionHistory.count > 100 {
            transcriptionHistory = Array(transcriptionHistory.prefix(100))
        }
        saveHistory()

        // Auto-type
        if autoTypeEnabled {
            let textToType = finalText + " "
            autoTypeService?.typeText(textToType)
            recentOutputLengths.append(textToType.count)
            sessionTotalChars += textToType.count
            if recentOutputLengths.count > 20 {
                recentOutputLengths.removeFirst()
            }
        }
    }

    // MARK: - Batch Transcription Pipeline

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

        // Quick energy check — skip API call if chunk is pure silence
        var rms: Float = 0
        samples.withUnsafeBufferPointer { ptr in
            var sum: Float = 0
            for s in ptr { sum += s * s }
            rms = sqrt(sum / Float(ptr.count))
        }
        if rms < 0.005 {
            logToFile("Skipping silence chunk (rms=\(String(format: "%.4f", rms)), dur=\(String(format: "%.1f", chunkSeconds))s)")
            await MainActor.run { isProcessing = false }
            return
        }

        do {
            let trimmed: String

            if useCloudTranscription && (!geminiApiKey.isEmpty || !openRouterApiKey.isEmpty) {
                // CLOUD PATH: OpenRouter or Gemini does transcription + cleanup in one call
                let result = try await geminiTranscriptionService?.transcribe(
                    audioSamples: samples,
                    language: language,
                    apiKey: geminiApiKey,
                    openRouterKey: openRouterApiKey,
                    customInstructions: customStyleInstructions,
                    vocabulary: customVocabulary
                ) ?? ""
                logToFile("Gemini cloud: \"\(result.prefix(80))\" (rms=\(String(format: "%.3f", rms)) dur=\(String(format: "%.1f", chunkSeconds))s)")
                trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                // LOCAL PATH: WhisperKit + optional LLM cleanup
                let text = try await transcriptionService?.transcribe(
                    audioSamples: samples,
                    language: language
                ) ?? ""
                trimmed = text.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
            }

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
            let rawText = trimmed

            // LLM cleanup — only for LOCAL path (cloud already does cleanup)
            let llmOutput: String
            if useCloudTranscription && (!geminiApiKey.isEmpty || !openRouterApiKey.isEmpty) {
                // Cloud path: already cleaned the text
                llmOutput = trimmed
            } else {
                // Local path: optional LLM cleanup
                let wordCount = trimmed.split(separator: " ").count
                logToFile("LLM gate: enabled=\(llmCleanupEnabled) hasKey=\(hasAnyLLMKey) canUse=\(canUseLLMCleanup) words=\(wordCount) cleanups=\(llmCleanupsToday)")
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
            }

            // FEATURE 4: Smart punctuation (AFTER cleanup)
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
                    TranscriptionEntry(originalText: rawText, cleanedText: finalText),
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
            logToFile("Transcription error: \(error)")
            await MainActor.run {
                isProcessing = false
                if !isRecording { floatingIndicator?.hide() }
            }
        }
    }
}
