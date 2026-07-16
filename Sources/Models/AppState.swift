import Foundation
import SwiftUI
import Network
import Supabase

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

    /// Free tier: Tiny + Base only. Small / Large V3 Turbo / Large V3 require Pro.
    var isFree: Bool {
        switch self {
        case .tiny, .base: return true
        case .small, .largeTurbo, .large: return false
        }
    }
}

// MARK: - Output Mode

/// Controls what gets pasted to the active app after transcription.
/// Cloud save (IW-007) fires in all modes — only the typed/pasted output differs.
enum OutputMode: String, CaseIterable, Identifiable {
    case raw = "raw"          // paste exactly as transcribed (skip LLM cleanup + smart punct)
    case clean = "clean"      // LLM-polish punctuation + grammar (current default)
    case summary = "summary"  // LLM-compress to 30-50% length

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .raw: return "Raw"
        case .clean: return "Clean (default)"
        case .summary: return "Summary"
        }
    }

    var blurb: String {
        switch self {
        case .raw: return "Paste exactly as transcribed."
        case .clean: return "LLM polishes punctuation + grammar."
        case .summary: return "LLM compresses to 30-50% length."
        }
    }
}

// MARK: - Free Tier Limits

enum FreeTierLimits {
    static let minutesPerDay: Double = 60.0    // 60 min/day local transcription
    static let llmCleanupsPerDay: Int = 3      // 3 Gemini/Groq cleanups/day
    static let maxDevices: Int = 3             // 3 active devices on a single license
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
    var modelLoadFailed = false

    // Permission health (client-ready pass) — drives visible warnings instead of silent failures
    var micPermissionLost = false
    var accessibilityFallbackActive = false
    var cloudTranscriptionError: String?

    // Transcription
    var lastTranscription = ""
    var transcriptionHistory: [TranscriptionEntry] = []

    // Scratch-that tracking (non-persisted, per session)
    var recentOutputLengths: [Int] = []

    // Push-to-talk state (non-persisted, per recording session)
    private var pttHeldStart: Date?
    private var pttCancelOnNextStop = false
    var sessionTotalChars: Int = 0

    /// Local VAD chunks are transcribed serially and buffered in spoken order.
    /// The user's document remains untouched until the entire session is finalized.
    private var chunkChain: Task<Void, Never>?
    private var sessionChunks: [String] = []
    private var sessionAudioSeconds: Double = 0
    private var isFinalizingSession = false
    private var sessionUsesCloud = false

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

    /// Cloud transcription via Groq — one whole-session request at stop.
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
            if useCloudTranscription && !groqApiKey.isEmpty {
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

    /// Read by LLMCleanupService directly — a no-op when llmCleanupEnabled is off.
    var smartListsEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "smartListsEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "smartListsEnabled") }
    }

    /// What gets pasted: raw / clean / summary. Default = .clean (no migration friction).
    var outputMode: OutputMode {
        get { OutputMode(rawValue: UserDefaults.standard.string(forKey: "outputMode") ?? "clean") ?? .clean }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "outputMode") }
    }

    /// Play a quiet sound on recording start/stop. Default ON.
    var soundEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "soundEnabled") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "soundEnabled") }
    }

    /// Push-to-talk modifier key. Setter updates the persisted UserDefaults
    /// AND re-registers the global flagsChanged monitor on HotkeyService.
    /// Default = .leftOption (Dhruv reserves Right Option for Wispr Flow).
    var pttKey: PTTKey {
        get { hotkeyService?.pttKey ?? PTTKey(rawValue: UserDefaults.standard.string(forKey: "pttKey") ?? "leftOption") ?? .leftOption }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "pttKey")
            hotkeyService?.updatePTTKey(newValue)
        }
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

    // MARK: - Auth state

    /// Currently signed-in Supabase user, or nil when signed out.
    /// Hydrated from Keychain at launch by `startAuthObserver()`, kept live by an
    /// AsyncStream subscription on `SupabaseService.shared.authStateChanges()`.
    var currentUser: User?

    /// Pro = validated license key. Dev mode (.env present) auto-Pro for the developer.
    var isPro: Bool {
        get {
            if isDevMode { return true }
            return UserDefaults.standard.bool(forKey: "isPro")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "isPro")
        }
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
        // Health warnings first — silent failures are the #1 churn cause
        if micPermissionLost { return "Mic access revoked — fix in System Settings" }
        if modelLoadFailed && !useCloudTranscription { return "Model download failed — Retry below" }
        if accessibilityFallbackActive && autoTypeEnabled && !AutoTypeService.isAccessibilityGranted() {
            return "Text copied to clipboard — grant Accessibility to auto-type"
        }
        if isModelDownloading { return "Downloading model (\(Int(modelDownloadProgress * 100))%)..." }
        if useCloudTranscription {
            if groqApiKey.isEmpty { return "Set Groq API key in Settings" }
            if let cloudTranscriptionError { return cloudTranscriptionError }
            if isRecording { return "Listening (Cloud)..." }
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
    var groqTranscriptionService: GroqTranscriptionService?
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
        groqTranscriptionService = GroqTranscriptionService()
        audioService = AudioCaptureService()
        autoTypeService = AutoTypeService()
        llmCleanupService = LLMCleanupService()
        licenseService = LicenseService()

        await startAuthObserver()

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

            // Push-to-talk hotkey (modifier-only, hold-to-record). Coexists with Cmd+D toggle.
            hotkeyService?.registerPTT(
                onPress: { [weak self] in
                    Task { @MainActor [weak self] in
                        guard let self = self else { return }
                        // If Cmd+D toggle is already recording, ignore PTT press.
                        guard !self.isRecording, !self.isFinalizingSession else {
                            logToFile("PTT press ignored: recording active or previous session in stop grace/finalization")
                            return
                        }
                        self.pttHeldStart = Date()
                        self.startRecording()
                    }
                },
                onRelease: { [weak self] in
                    Task { @MainActor [weak self] in
                        guard let self = self else { return }
                        // Only act on release if we're actually PTT-recording.
                        guard self.isRecording, let start = self.pttHeldStart else { return }
                        let heldFor = Date().timeIntervalSince(start)
                        self.pttHeldStart = nil
                        if heldFor < 0.2 {
                            // Accidental tap — discard buffer, no transcribe.
                            self.pttCancelOnNextStop = true
                            logToFile("PTT cancelled: held \(String(format: "%.0f", heldFor * 1000))ms < 200ms")
                        } else {
                            logToFile("PTT released after \(String(format: "%.0f", heldFor * 1000))ms — transcribing")
                        }
                        self.stopRecording()
                    }
                }
            )

            if !AXIsProcessTrusted() {
                logToFile("Accessibility not granted — prompting user")
                AutoTypeService.promptAccessibilityOnce()
            } else {
                logToFile("Accessibility granted")
            }
        }
        logToFile("Services initialized, hotkey registered")

        // If cloud mode, mark ready immediately (no model download needed)
        let hasCloudKey = !groqApiKey.isEmpty
        logToFile("Cloud check: useCloud=\(useCloudTranscription) groqKey=\(groqApiKey.isEmpty ? "EMPTY" : "SET")")
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

    /// Hydrate `currentUser` from existing Supabase session on launch and listen
    /// for future auth changes (sign-in, sign-out, token refresh).
    @MainActor
    func startAuthObserver() async {
        // Pull initial state (Keychain-cached session, no network)
        self.currentUser = await SupabaseService.shared.currentUser

        // Listen for changes (infinite for-await loop, lives for app lifetime)
        Task {
            for await event in SupabaseService.shared.authStateChanges() {
                await MainActor.run {
                    Task {
                        self.currentUser = await SupabaseService.shared.currentUser
                        logToFile("AppState: auth state changed (\(event)) — currentUser=\(self.currentUser?.email ?? "nil")")
                    }
                }
            }
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
            modelLoadFailed = false
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
            // All retries exhausted and still no model → surface a Retry button
            // in the menu instead of leaving the user stuck at "Loading model..."
            if !isModelLoaded {
                modelLoadFailed = true
                logToFile("Model load FAILED after all retries — Retry button shown")
            }
        }
    }

    // MARK: - Recording

    @MainActor
    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else if !isFinalizingSession {
            startRecording()
        }
    }

    /// Play a built-in macOS system sound at quiet volume.
    /// Used as audio cue for recording start/stop.
    /// Volume 0.3 = barely audible, just enough to confirm action.
    private func playRecordingSound(_ name: String) {
        guard soundEnabled, let sound = NSSound(named: name) else { return }
        sound.volume = 0.3
        sound.play()
        logToFile("Sound played: \(name) (vol 0.3)")
    }

    @MainActor
    func startRecording() {
        guard !isFinalizingSession else {
            logToFile("startRecording ignored — previous session still finalizing")
            return
        }
        // Mic permission can be revoked in System Settings AFTER onboarding —
        // without this check the app would "record" silence with no error.
        guard PermissionService.microphoneStatus() == .granted else {
            micPermissionLost = true
            logToFile("startRecording blocked: microphone permission missing/revoked")
            return
        }
        micPermissionLost = false

        // Cloud mode doesn't need a local model unless Groq fails.
        let hasCloudKey = !groqApiKey.isEmpty
        guard useCloudTranscription ? hasCloudKey : isModelLoaded else { return }

        isRecording = true
        cloudTranscriptionError = nil
        playRecordingSound("Tink")  // sharp click cue on start
        if useCloudTranscription && hasCloudKey {
            isModelLoaded = true  // ensure UI shows ready
        }
        floatingIndicator?.update(isRecording: true, isProcessing: false)

        // Reset scratch-that tracking for new session
        recentOutputLengths.removeAll()
        sessionTotalChars = 0
        chunkChain = nil
        sessionChunks.removeAll()
        sessionAudioSeconds = 0
        isFinalizingSession = false

        sessionUsesCloud = useCloudTranscription && hasCloudKey

        // Configure audio thresholds based on transcription mode
        audioService?.configureForCloudMode(sessionUsesCloud)
        if sessionUsesCloud {
            logToFile("Cloud session started — buffering audio; mid-session transcription and voice commands disabled")
        }

        do {
            try audioService?.startRecording(
                chunkDuration: chunkDuration,
                silenceThreshold: silenceThreshold
            ) { [weak self] samples in
                Task { @MainActor [weak self] in
                    guard let self, !self.sessionUsesCloud else { return }
                    self.enqueueChunk(samples)
                }
            }
        } catch {
            print("[IndianWhisper] Recording error: \(error)")
            isRecording = false
        }
    }

    @MainActor
    func stopRecording() {
        guard !isFinalizingSession else { return }
        isRecording = false
        isFinalizingSession = true
        playRecordingSound("Pop")  // soft thud cue on stop
        floatingIndicator?.update(isRecording: false, isProcessing: true)
        let stopStartedAt = Date()

        Task { @MainActor [weak self] in
            guard let self else { return }
            let remaining = await self.audioService?.stopRecording()
            let cloudSession = self.audioService?.takeRetainedCloudSession()
            self.finishStoppedRecording(
                remaining: remaining,
                cloudSession: cloudSession,
                stopStartedAt: stopStartedAt
            )
        }
    }

    @MainActor
    private func finishStoppedRecording(
        remaining: [Float]?,
        cloudSession: (samples: [Float], exceededLimit: Bool)?,
        stopStartedAt: Date
    ) {
        if pttCancelOnNextStop {
            pttCancelOnNextStop = false
            logToFile("PTT cancel — discarding \(remaining?.count ?? 0) samples")
            let pending = chunkChain
            Task { @MainActor [weak self] in
                await pending?.value
                self?.resetBufferedSession()
            }
            return
        }

        if sessionUsesCloud {
            Task { @MainActor [weak self] in
                guard let self else { return }
                await self.finalizeCloudSession(
                    cloudSession,
                    stopStartedAt: stopStartedAt
                )
            }
            return
        }

        let previous = chunkChain
        let finalTask = Task { [weak self] () -> Int in
            await previous?.value
            let finalStartedAt = Date()
            if let remaining, !remaining.isEmpty {
                await self?.processChunk(remaining, isFinalChunk: true)
            }
            return Int(Date().timeIntervalSince(finalStartedAt) * 1000)
        }
        chunkChain = Task { _ = await finalTask.value }

        Task { @MainActor [weak self] in
            guard let self else { return }
            let finalChunkMs = await finalTask.value
            await self.finalizeBufferedSession(
                stopStartedAt: stopStartedAt,
                finalChunkMs: finalChunkMs,
                engine: "local"
            )
        }
    }

    @MainActor
    private func enqueueChunk(_ samples: [Float]) {
        let previous = chunkChain
        chunkChain = Task { [weak self] in
            await previous?.value
            await self?.processChunk(samples)
        }
    }

    // MARK: - Insert-Once Session Buffer

    @MainActor
    private func appendSessionChunk(_ text: String, duration: Double) {
        sessionChunks.append(text)
        sessionAudioSeconds += duration
        logToFile("SESSION: buffered chunk \(sessionChunks.count) (\(text.count) chars)")
    }

    @MainActor
    private func dropLastSessionChunk() {
        guard let removed = sessionChunks.popLast() else { return }
        logToFile("SCRATCH THAT: dropped buffered chunk (\(removed.count) chars)")
    }

    @MainActor
    private func deleteLastBufferedWord() {
        guard !sessionChunks.isEmpty else { return }
        var words = sessionChunks[sessionChunks.count - 1].split(separator: " ")
        if !words.isEmpty { words.removeLast() }
        if words.isEmpty {
            sessionChunks.removeLast()
        } else {
            sessionChunks[sessionChunks.count - 1] = words.joined(separator: " ")
        }
        logToFile("DELETE WORD: removed from session buffer")
    }

    @MainActor
    private func clearSessionBuffer() {
        sessionChunks.removeAll()
        sessionAudioSeconds = 0
        logToFile("CLEAR ALL: session buffer emptied")
    }

    @MainActor
    private func resetBufferedSession() {
        chunkChain = nil
        sessionChunks.removeAll()
        sessionAudioSeconds = 0
        sessionUsesCloud = false
        isProcessing = false
        isFinalizingSession = false
        floatingIndicator?.hide()
    }

    @MainActor
    private func sendDocumentKey(_ keyCode: CGKeyCode, command: Bool = false, label: String) {
        let source = CGEventSource(stateID: .hidSystemState)
        guard let down = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: true),
              let up = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: false) else { return }
        if command {
            down.flags = .maskCommand
            up.flags = .maskCommand
        }
        down.post(tap: .cgSessionEventTap)
        up.post(tap: .cgSessionEventTap)
        logToFile("\(label) sent")
    }

    @MainActor
    private func finalizeCloudSession(
        _ capture: (samples: [Float], exceededLimit: Bool)?,
        stopStartedAt: Date
    ) async {
        guard let capture else {
            surfaceCloudTranscriptionError("Cloud audio capture failed. Try again or switch Cloud off.")
            return
        }
        guard !capture.exceededLimit else {
            logToFile("SESSION: cloud rejected — recording exceeded 5-minute memory cap")
            surfaceCloudTranscriptionError("Cloud recordings are limited to 5 minutes. Switch Cloud off for longer dictation.")
            return
        }
        guard !capture.samples.isEmpty else {
            await finalizeBufferedSession(
                stopStartedAt: stopStartedAt,
                finalChunkMs: 0,
                engine: "groq"
            )
            return
        }

        let duration = Double(capture.samples.count) / 16000.0
        trackTranscriptionTime(seconds: duration)
        let transcriptionStartedAt = Date()

        do {
            let text = try await groqTranscriptionService?.transcribe(
                audioSamples: capture.samples,
                apiKey: groqApiKey,
                language: hindiMode ? "hi" : nil
            ) ?? ""
            let transcriptionMs = Int(Date().timeIntervalSince(transcriptionStartedAt) * 1000)
            appendSessionChunk(text, duration: duration)
            await finalizeBufferedSession(
                stopStartedAt: stopStartedAt,
                finalChunkMs: transcriptionMs,
                engine: "groq"
            )
        } catch {
            logToFile("Groq transcription failed: \(error.localizedDescription)")
            guard transcriptionService?.hasLoadedModel == true else {
                surfaceCloudTranscriptionError("Cloud transcription failed. Check your connection or switch Cloud off after the local model loads.")
                return
            }

            do {
                logToFile("Groq fallback: transcribing retained session with local WhisperKit")
                let text = try await transcriptionService?.transcribe(
                    audioSamples: capture.samples,
                    language: language
                ) ?? ""
                let transcriptionMs = Int(Date().timeIntervalSince(transcriptionStartedAt) * 1000)
                appendSessionChunk(text, duration: duration)
                await finalizeBufferedSession(
                    stopStartedAt: stopStartedAt,
                    finalChunkMs: transcriptionMs,
                    engine: "local"
                )
            } catch {
                logToFile("Groq local fallback failed: \(error.localizedDescription)")
                surfaceCloudTranscriptionError("Cloud and local transcription both failed. Your document was not changed.")
            }
        }
    }

    @MainActor
    private func surfaceCloudTranscriptionError(_ message: String) {
        cloudTranscriptionError = message
        resetBufferedSession()
    }

    @MainActor
    private func finalizeBufferedSession(stopStartedAt: Date, finalChunkMs: Int, engine: String) async {
        isProcessing = true
        let rawText = sessionChunks
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let durationSeconds = sessionAudioSeconds
        var cleanupMs = 0
        defer { resetBufferedSession() }

        guard !rawText.isEmpty else {
            logToFile("SESSION: stop→pasted \(Int(Date().timeIntervalSince(stopStartedAt) * 1000))ms (final-chunk \(finalChunkMs)ms, cleanup 0ms, chars 0, engine=\(engine))")
            return
        }

        let fallback = smartPunctuationEnabled
            ? SmartPunctuationService.apply(rawText)
            : rawText
        var outputText = fallback
        var llmCleanupModel: String?

        switch outputMode {
        case .raw:
            outputText = rawText
        case .clean:
            let wordCount = rawText.split(separator: " ").count
            if llmCleanupEnabled && hasAnyLLMKey && canUseLLMCleanup && wordCount >= 3 {
                llmCleanupsToday += 1
                let cleanupStartedAt = Date()
                let cleaned = await llmCleanupService?.cleanWithProvider(
                    rawText,
                    provider: selectedLLMProvider,
                    apiKeys: allAPIKeys(),
                    customInstructions: customStyleInstructions,
                    formatLists: true,
                    maxTokens: 1024
                ) ?? rawText
                cleanupMs = Int(Date().timeIntervalSince(cleanupStartedAt) * 1000)
                let candidate = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
                if !candidate.isEmpty,
                   candidate != "[SKIP]",
                   candidate != rawText,
                   candidate.count >= Int(Double(rawText.count) * 0.6) {
                    outputText = candidate
                    llmCleanupModel = selectedLLMProvider.modelName
                } else if candidate.count < Int(Double(rawText.count) * 0.6) {
                    logToFile("SESSION: cleanup \(candidate.count) vs raw \(rawText.count) — suspected truncation, using punctuation fallback")
                }
            }
        case .summary:
            let wordCount = rawText.split(separator: " ").count
            if hasAnyLLMKey && wordCount >= 3 {
                let cleanupStartedAt = Date()
                outputText = await llmCleanupService?.summarizeWithProvider(
                    rawText,
                    provider: selectedLLMProvider,
                    apiKeys: allAPIKeys(),
                    language: hindiMode ? "hi-IN" : "en-IN",
                    customInstructions: customStyleInstructions
                ) ?? fallback
                cleanupMs = Int(Date().timeIntervalSince(cleanupStartedAt) * 1000)
                llmCleanupModel = selectedLLMProvider.modelName
            }
        }

        lastTranscription = outputText
        transcriptionHistory.insert(
            TranscriptionEntry(originalText: rawText, cleanedText: outputText),
            at: 0
        )
        if transcriptionHistory.count > 100 {
            transcriptionHistory = Array(transcriptionHistory.prefix(100))
        }
        saveHistory()

        if currentUser != nil {
            let language: String = hindiMode ? "hi-IN" : "en-IN"
            let modelUsed = engine == "groq"
                ? "groq-whisper-large-v3-turbo"
                : "whisper-\(selectedModel.rawValue)"
            let wordCount = outputText.split(separator: " ").count
            Task.detached {
                _ = await SupabaseService.shared.saveTranscript(
                    rawText: rawText,
                    cleanedText: outputText,
                    language: language,
                    modelUsed: modelUsed,
                    llmCleanupModel: llmCleanupModel,
                    durationSeconds: durationSeconds > 0 ? Int(durationSeconds) : nil,
                    wordCount: wordCount,
                    charCount: outputText.count
                )
            }
        }

        if autoTypeEnabled {
            accessibilityFallbackActive = !AutoTypeService.isAccessibilityGranted()
            let textToPaste = outputText + " "
            autoTypeService?.pasteText(textToPaste)
            recentOutputLengths = [textToPaste.count]
            sessionTotalChars = textToPaste.count
        }

        let totalMs = Int(Date().timeIntervalSince(stopStartedAt) * 1000)
        logToFile("SESSION: stop→pasted \(totalMs)ms (final-chunk \(finalChunkMs)ms, cleanup \(cleanupMs)ms, chars \(outputText.count), engine=\(engine))")
    }

    // MARK: - Batch Transcription Pipeline

    func processChunk(_ samples: [Float], isFinalChunk: Bool = false) async {
        resetDailyUsageIfNeeded()

        if isFreeTierExhausted {
            await MainActor.run {
                showUpgradePrompt = true
                logToFile("Free tier exhausted (\(minutesTranscribedToday)m used). Stopping.")
                Task { @MainActor [weak self] in self?.stopRecording() }
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
                        dropLastSessionChunk()
                        isProcessing = false
                    }
                    return

                case .deleteWord:
                    await MainActor.run {
                        deleteLastBufferedWord()
                        isProcessing = false
                    }
                    return

                case .clearAll:
                    await MainActor.run {
                        clearSessionBuffer()
                        isProcessing = false
                    }
                    return

                case .copy:
                    await MainActor.run {
                        sendDocumentKey(8, command: true, label: "COPY: Cmd+C")
                        isProcessing = false
                    }
                    return

                case .paste:
                    await MainActor.run {
                        sendDocumentKey(9, command: true, label: "PASTE: Cmd+V")
                        isProcessing = false
                    }
                    return

                case .cut:
                    await MainActor.run {
                        sendDocumentKey(7, command: true, label: "CUT: Cmd+X")
                        isProcessing = false
                    }
                    return

                case .stopDictation:
                    logToFile("STOP command — ending dictation")
                    Task { @MainActor [weak self] in self?.stopRecording() }
                    return
                case .selectAll:
                    await MainActor.run {
                        sendDocumentKey(0, command: true, label: "SELECT ALL: Cmd+A")
                        isProcessing = false
                    }
                    return
                case .pressEnter:
                    await MainActor.run {
                        sendDocumentKey(36, label: "PRESS ENTER: Return")
                        isProcessing = false
                    }
                    return
                case .none:
                    break
                }
            }

            await MainActor.run {
                appendSessionChunk(trimmed, duration: chunkSeconds)
                isProcessing = false
                if isRecording {
                    floatingIndicator?.update(isRecording: true, isProcessing: false)
                }
            }
        } catch {
            print("[IndianWhisper] Transcription error: \(error)")
            logToFile("Transcription error: \(error)")
            await MainActor.run {
                isProcessing = false
                if !isRecording && !isFinalizingSession { floatingIndicator?.hide() }
            }
        }
    }
}
