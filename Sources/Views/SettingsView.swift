import SwiftUI
import Carbon

struct SettingsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        TabView {
            GeneralTab()
                .environment(appState)
                .tabItem { Label("General", systemImage: "gear") }

            ModelsTab()
                .environment(appState)
                .tabItem { Label("Models", systemImage: "cpu") }

            LLMTab()
                .environment(appState)
                .tabItem { Label("AI Cleanup", systemImage: "sparkles") }

            HistoryTab()
                .environment(appState)
                .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }

            AboutTab()
                .tabItem { Label("About", systemImage: "info.circle") }

            LicenseTab()
                .environment(appState)
                .tabItem { Label("License", systemImage: "key.fill") }
        }
        .frame(minWidth: 540, minHeight: 480)
    }
}

// MARK: - Secure API Key Field

private struct SecureAPIKeyField: View {
    let label: String
    @Binding var key: String
    @State private var showKey = false

    var body: some View {
        HStack(spacing: 6) {
            Text(label)
                .frame(width: 90, alignment: .trailing)
                .font(.caption)
                .foregroundStyle(.secondary)

            if showKey {
                TextField("", text: $key)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.caption, design: .monospaced))
            } else {
                SecureField("", text: $key)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.caption, design: .monospaced))
            }

            Button(action: { showKey.toggle() }) {
                Image(systemName: showKey ? "eye.slash" : "eye")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .help(showKey ? "Hide key" : "Show key")

            // Green dot if key is set
            Circle()
                .fill(key.isEmpty ? Color.clear : Color.green)
                .frame(width: 6, height: 6)
        }
    }
}

// MARK: - General

private struct GeneralTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Hotkey
                GroupBox("Recording") {
                    HStack {
                        Text("Hotkey:")
                        Text(appState.hotkeyService?.displayString ?? "Cmd + D")
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.quaternary)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .font(.system(.body, design: .monospaced))
                        Spacer()
                        HotkeyPicker(appState: appState)
                    }
                    .padding(.vertical, 4)

                    Toggle("Hindi Mode (Hindi/Hinglish → English)", isOn: $state.hindiMode)
                    Toggle("Auto-type transcribed text", isOn: $state.autoTypeEnabled)
                }

                GroupBox("Brand") {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Capsule label:")
                                .frame(width: 110, alignment: .trailing)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("AIwithDhruv", text: $state.listeningLabel)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                        }
                        Text("Shown on the floating capsule while recording. Put your name, your brand, anything up to ~14 characters so it fits.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.leading, 116)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("Text Processing") {
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle("Smart Punctuation", isOn: $state.smartPunctuationEnabled)
                        Text("Say \"comma\", \"period\", \"question mark\", \"new line\" etc.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.leading, 20)

                        Toggle("\"Scratch That\" Voice Commands", isOn: $state.scratchThatEnabled)
                        Text("\"scratch that\" = delete last, \"delete word\", \"clear all\"")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.leading, 20)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("Permissions") {
                    VStack(spacing: 6) {
                        HStack {
                            Text("Microphone")
                            Spacer()
                            PermissionBadge(granted: PermissionService.microphoneStatus() == .granted)
                        }
                        HStack {
                            Text("Accessibility (auto-type)")
                            Spacer()
                            PermissionBadge(granted: AutoTypeService.isAccessibilityGranted())
                        }
                        if !AutoTypeService.isAccessibilityGranted() {
                            Button("Open Accessibility Settings") {
                                PermissionService.requestAccessibilityPermission()
                            }
                            .font(.caption)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding()
        }
    }
}

// MARK: - LLM Tab

private struct LLMTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GroupBox("Provider") {
                    VStack(alignment: .leading, spacing: 8) {
                        Toggle("Enable LLM text cleanup", isOn: $state.llmCleanupEnabled)

                        Picker("Provider", selection: $state.selectedLLMProvider) {
                            ForEach(LLMProvider.allCases) { provider in
                                Text("\(provider.displayName) · \(provider.modelName) · \(provider.latencyEstimate)")
                                    .tag(provider)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("API Keys") {
                    VStack(spacing: 6) {
                        SecureAPIKeyField(label: "Groq", key: $state.groqApiKey)
                        SecureAPIKeyField(label: "OpenRouter", key: $state.openRouterApiKey)
                        SecureAPIKeyField(label: "Claude", key: $state.claudeApiKey)
                        SecureAPIKeyField(label: "OpenAI", key: $state.openAIApiKey)
                        SecureAPIKeyField(label: "Gemini", key: $state.geminiApiKey)
                        SecureAPIKeyField(label: "Moonshot", key: $state.moonshotApiKey)
                        SecureAPIKeyField(label: "DeepSeek", key: $state.deepSeekApiKey)

                        Text("Selected provider tried first, others as fallback. Also reads ~/.config/indianwhisper/.env")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.top, 4)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("Custom Instructions") {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("e.g. \"Professional tone\", \"Keep it casual\"", text: $state.customStyleInstructions, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                        Text("Appended to the LLM system prompt for style/tone control.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("Custom Vocabulary") {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("e.g. Kubernetes, Terraform, Netlify, Vite", text: $state.customVocabulary, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                        Text("Comma-separated words you use often. Helps fix misheard tech terms, names, etc.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding()
        }
    }
}

// MARK: - Hotkey Picker

private struct HotkeyPicker: View {
    let appState: AppState
    @State private var isRecording = false

    var body: some View {
        Button(isRecording ? "Press key..." : "Change") {
            isRecording = true
            NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
                guard isRecording else { return event }
                isRecording = false

                var carbonMods: UInt32 = 0
                if event.modifierFlags.contains(.command) { carbonMods |= UInt32(cmdKey) }
                if event.modifierFlags.contains(.option) { carbonMods |= UInt32(optionKey) }
                if event.modifierFlags.contains(.control) { carbonMods |= UInt32(controlKey) }
                if event.modifierFlags.contains(.shift) { carbonMods |= UInt32(shiftKey) }

                guard carbonMods != 0 else { return nil }

                appState.hotkeyService?.updateHotkey(
                    keyCode: UInt32(event.keyCode),
                    modifiers: carbonMods
                )
                return nil
            }
        }
        .buttonStyle(.bordered)
        .font(.caption)
    }
}

// MARK: - Models

private struct ModelsTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        Form {
            Picker("Active Model", selection: $state.selectedModel) {
                ForEach(WhisperModelSize.allCases) { model in
                    Text(model.displayName).tag(model)
                }
            }
            .onChange(of: appState.selectedModel) { _, _ in
                Task { await appState.loadModel() }
            }

            if appState.isModelDownloading {
                ProgressView(value: appState.modelDownloadProgress) {
                    Text("Downloading...")
                }
            }

            Section("Installed Models") {
                ForEach(WhisperModelSize.allCases) { model in
                    HStack {
                        Text(model.displayName)
                        Spacer()
                        if appState.transcriptionService?.isModelDownloaded(model) == true {
                            Text("Downloaded")
                                .foregroundStyle(.green)
                                .font(.caption)
                        } else {
                            Text("Not downloaded")
                                .foregroundStyle(.secondary)
                                .font(.caption)
                        }
                    }
                }
            }

            Section("Advanced") {
                HStack {
                    Text("Chunk: \(state.chunkDuration, specifier: "%.1f")s")
                        .frame(width: 80)
                    Slider(value: $state.chunkDuration, in: 2.0...8.0, step: 0.5)
                }

                HStack {
                    Text("Silence: \(state.silenceThreshold, specifier: "%.3f")")
                        .frame(width: 80)
                    Slider(
                        value: Binding(
                            get: { Double(state.silenceThreshold) },
                            set: { state.silenceThreshold = Float($0) }
                        ),
                        in: 0.002...0.05,
                        step: 0.002
                    )
                }

                Text("Lower = more sensitive, Higher = less background noise.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}

// MARK: - History

private struct HistoryTab: View {
    @Environment(AppState.self) private var appState
    @State private var searchText = ""

    private var filteredHistory: [TranscriptionEntry] {
        if searchText.isEmpty { return appState.transcriptionHistory }
        let query = searchText.lowercased()
        return appState.transcriptionHistory.filter {
            $0.cleanedText.lowercased().contains(query) ||
            $0.originalText.lowercased().contains(query)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Search history...", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                Spacer()
                Text("\(appState.transcriptionHistory.count) entries")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Clear All") {
                    appState.clearHistory()
                }
                .foregroundStyle(.red)
                .font(.caption)
                .disabled(appState.transcriptionHistory.isEmpty)
            }
            .padding(.horizontal)
            .padding(.top, 12)
            .padding(.bottom, 8)

            if filteredHistory.isEmpty {
                Spacer()
                Text(appState.transcriptionHistory.isEmpty ? "No transcriptions yet." : "No matches.")
                    .foregroundStyle(.secondary)
                Spacer()
            } else {
                List(filteredHistory) { entry in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.cleanedText)
                            .lineLimit(3)
                        if entry.originalText != entry.cleanedText {
                            Text("Raw: \(entry.originalText)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        Text(entry.timestamp, style: .relative)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .contextMenu {
                        Button("Copy") {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(entry.cleanedText, forType: .string)
                        }
                        if entry.originalText != entry.cleanedText {
                            Button("Copy Original") {
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(entry.originalText, forType: .string)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - About

private struct AboutTab: View {
    @State private var checkingUpdate = false
    @State private var checkedOnce = false

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "mic.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.blue)

            Text("IndianWhisper")
                .font(.title.bold())

            Text("Community Edition")
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("v\(UpdateService.shared.currentVersion)")
                .font(.caption)
                .foregroundStyle(.tertiary)

            VStack(spacing: 8) {
                Text("100% on-device voice transcription powered by WhisperKit.")
                    .multilineTextAlignment(.center)
                Text("Your voice data never leaves your computer.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            .font(.callout)
            .padding(.horizontal, 40)

            // Check for Updates
            Button(checkingUpdate ? "Checking..." : "Check for Updates") {
                checkingUpdate = true
                Task {
                    await UpdateService.shared.checkForUpdates(force: true)
                    await MainActor.run {
                        checkingUpdate = false
                        checkedOnce = true
                        if UpdateService.shared.updateAvailable {
                            UpdateService.shared.showUpdateAlert()
                        }
                    }
                }
            }
            .buttonStyle(.bordered)
            .font(.caption)
            .disabled(checkingUpdate)

            if checkedOnce && !UpdateService.shared.updateAvailable {
                Text("You're on the latest version")
                    .font(.caption)
                    .foregroundStyle(.green)
            }

            Divider().padding(.horizontal, 60)

            VStack(spacing: 4) {
                Text("Built by AiwithDhruv")
                    .font(.caption.bold())
                Link("youtube.com/@AiwithDhruv", destination: URL(string: "https://youtube.com/@AiwithDhruv")!)
                    .font(.caption)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Permission Badge

struct PermissionBadge: View {
    let granted: Bool

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: granted ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(granted ? .green : .red)
            Text(granted ? "Granted" : "Not granted")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - License Tab

private struct LicenseTab: View {
    @Environment(AppState.self) private var appState
    @State private var isActivating = false
    @State private var statusMessage: String?
    @State private var statusIsError = false

    /// Brand neon cyan #18D1E0 (Rule 58)
    private static let brandCyan = Color(red: 0.094, green: 0.820, blue: 0.878)

    var body: some View {
        @Bindable var state = appState

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GroupBox("Status") {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Image(systemName: appState.isPro ? "checkmark.seal.fill" : "lock.fill")
                                .foregroundStyle(appState.isPro ? Self.brandCyan : .secondary)
                            Text(appState.isPro ? "Pro" : "Free")
                                .font(.headline)
                            Spacer()
                        }
                        if !appState.isPro {
                            Text("\(Int(appState.freeMinutesRemaining)) of 60 minutes remaining today")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("\(appState.freeLLMCleanupsRemaining) of 3 LLM cleanups remaining today")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("License Key") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            SecureField("Paste your license key", text: $state.licenseKey)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                                .disabled(isActivating)

                            Button(isActivating ? "Activating..." : "Activate") {
                                activateKey()
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(state.licenseKey.isEmpty || isActivating)
                        }

                        if let msg = statusMessage {
                            HStack(spacing: 4) {
                                Image(systemName: statusIsError ? "xmark.circle.fill" : "checkmark.circle.fill")
                                    .foregroundStyle(statusIsError ? .red : .green)
                                Text(msg)
                                    .font(.caption)
                                    .foregroundStyle(statusIsError ? .red : .green)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                GroupBox("Get Pro") {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Unlock all 5 Whisper models, all 7 LLM providers, Gemini Live streaming, and unlimited transcription.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Link("indianwhisper.com/pricing", destination: URL(string: "https://indianwhisper.com/pricing")!)
                            .font(.caption)
                            .foregroundStyle(Self.brandCyan)
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding()
        }
    }

    private func activateKey() {
        let key = appState.licenseKey
        guard !key.isEmpty else { return }

        isActivating = true
        statusMessage = nil

        Task {
            let result: (success: Bool, message: String) = await appState.licenseService?.activate(key)
                ?? (success: false, message: "License service unavailable")
            await MainActor.run {
                isActivating = false
                statusMessage = result.message
                statusIsError = !result.success
                if result.success {
                    appState.isPro = true
                }
            }
        }
    }
}
