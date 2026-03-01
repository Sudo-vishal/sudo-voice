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

            AdvancedTab()
                .environment(appState)
                .tabItem { Label("Advanced", systemImage: "slider.horizontal.3") }

            LicenseTab()
                .environment(appState)
                .tabItem { Label("License", systemImage: "key") }
        }
        .frame(width: 440, height: 340)
    }
}

// MARK: - General

private struct GeneralTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        Form {
            // Hotkey display
            HStack {
                Text("Recording Hotkey:")
                Text(appState.hotkeyService?.displayString ?? "Cmd + D")
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .font(.system(.body, design: .monospaced))
                Spacer()
                HotkeyPicker(appState: appState)
            }

            Toggle("Hindi Mode (Hindi/Hinglish → English)", isOn: $state.hindiMode)
            Toggle("Auto-type transcribed text", isOn: $state.autoTypeEnabled)

            Section("LLM Cleanup") {
                Toggle("Enable LLM text cleanup", isOn: $state.llmCleanupEnabled)

                if !appState.isPro {
                    Text("\(appState.freeLLMCleanupsRemaining) cleanups remaining today")
                        .font(.caption)
                        .foregroundStyle(appState.freeLLMCleanupsRemaining > 5 ? Color.secondary : Color.orange)
                }

                TextField("Groq API Key (fastest)", text: $state.groqApiKey)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.body, design: .monospaced))
                TextField("OpenRouter API Key (fallback)", text: $state.openRouterApiKey)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.body, design: .monospaced))
                Text("Groq (~100ms) preferred, OpenRouter (~300ms) fallback. Removes fillers, fixes grammar.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Permissions") {
                HStack {
                    Text("Microphone")
                    Spacer()
                    PermissionBadge(granted: PermissionService.microphoneStatus() == .granted)
                }
                HStack {
                    Text("Accessibility (for auto-type)")
                    Spacer()
                    PermissionBadge(granted: AutoTypeService.isAccessibilityGranted())
                }
                if !AutoTypeService.isAccessibilityGranted() {
                    Button("Open Accessibility Settings") {
                        PermissionService.requestAccessibilityPermission()
                    }
                }
            }
        }
        .padding()
    }
}

// MARK: - Hotkey Picker

private struct HotkeyPicker: View {
    let appState: AppState
    @State private var isRecording = false

    var body: some View {
        Button(isRecording ? "Press key..." : "Change") {
            isRecording = true
            // Listen for next key event
            NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
                guard isRecording else { return event }
                isRecording = false

                var carbonMods: UInt32 = 0
                if event.modifierFlags.contains(.command) { carbonMods |= UInt32(cmdKey) }
                if event.modifierFlags.contains(.option) { carbonMods |= UInt32(optionKey) }
                if event.modifierFlags.contains(.control) { carbonMods |= UInt32(controlKey) }
                if event.modifierFlags.contains(.shift) { carbonMods |= UInt32(shiftKey) }

                // Require at least one modifier
                guard carbonMods != 0 else { return nil }

                appState.hotkeyService?.updateHotkey(
                    keyCode: UInt32(event.keyCode),
                    modifiers: carbonMods
                )
                return nil  // Consume the event
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
                    HStack {
                        Text(model.displayName)
                        if !model.isFree && !appState.isPro {
                            Text("PRO")
                                .font(.caption2.bold())
                                .foregroundStyle(.orange)
                        }
                    }
                    .tag(model)
                }
            }
            .onChange(of: appState.selectedModel) { _, newModel in
                if newModel.isFree || appState.isPro {
                    Task { await appState.loadModel() }
                }
            }

            if !appState.isPro {
                Text("Free tier: Tiny & Base only. Upgrade to Pro for all models.")
                    .font(.caption)
                    .foregroundStyle(.orange)
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
                        if !model.isFree {
                            Text("PRO")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
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
                    .opacity(!model.isFree && !appState.isPro ? 0.5 : 1.0)
                }
            }
        }
        .padding()
    }
}

// MARK: - Advanced

private struct AdvancedTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        Form {
            HStack {
                Text("Chunk Duration: \(state.chunkDuration, specifier: "%.1f")s")
                Slider(value: $state.chunkDuration, in: 2.0...8.0, step: 0.5)
            }

            HStack {
                Text("Silence Threshold: \(state.silenceThreshold, specifier: "%.3f")")
                Slider(
                    value: Binding(
                        get: { Double(state.silenceThreshold) },
                        set: { state.silenceThreshold = Float($0) }
                    ),
                    in: 0.002...0.05,
                    step: 0.002
                )
            }

            Text("Lower threshold = more sensitive (picks up quieter speech). Higher = less background noise.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

// MARK: - License

private struct LicenseTab: View {
    @Environment(AppState.self) private var appState
    @State private var licenseInput = ""
    @State private var activating = false
    @State private var message = ""

    var body: some View {
        Form {
            // Status
            HStack {
                Text("Status:")
                if appState.isPro {
                    Label("Pro", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                        .font(.body.bold())
                } else {
                    Text("Free")
                        .foregroundStyle(.secondary)
                }
            }

            if !appState.isPro {
                // Usage
                Section("Daily Usage") {
                    HStack {
                        Text("Transcription")
                        Spacer()
                        Text("\(String(format: "%.1f", appState.minutesTranscribedToday)) / \(Int(FreeTierLimits.minutesPerDay)) min")
                            .foregroundStyle(appState.isFreeTierExhausted ? .red : .secondary)
                    }
                    ProgressView(value: min(appState.minutesTranscribedToday, FreeTierLimits.minutesPerDay), total: FreeTierLimits.minutesPerDay)
                        .tint(appState.isFreeTierExhausted ? .red : .blue)

                    HStack {
                        Text("LLM Cleanups")
                        Spacer()
                        Text("\(appState.llmCleanupsToday) / \(FreeTierLimits.llmCleanupsPerDay)")
                            .foregroundStyle(!appState.canUseLLMCleanup ? .red : .secondary)
                    }
                }
            }

            Section("License Key") {
                TextField("Enter license key", text: $licenseInput)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.body, design: .monospaced))
                    .onAppear { licenseInput = appState.licenseKey }

                if !message.isEmpty {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(appState.isPro ? .green : .red)
                }

                HStack {
                    Button(activating ? "Activating..." : "Activate License") {
                        activateKey()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(licenseInput.isEmpty || activating)

                    if appState.isPro {
                        Button("Deactivate") {
                            appState.licenseKey = ""
                            appState.isPro = false
                            licenseInput = ""
                            message = ""
                        }
                        .buttonStyle(.bordered)
                        .foregroundStyle(.red)
                    }
                }
            }

            if !appState.isPro {
                Section {
                    Text("Get Pro: Unlimited transcription, all models, unlimited LLM cleanup")
                        .font(.caption)
                    Link("Buy at indianwhisper.com", destination: URL(string: "https://indianwhisper.com")!)
                        .font(.caption)
                }
            }
        }
        .padding()
    }

    private func activateKey() {
        activating = true
        message = ""
        Task {
            let result = await appState.licenseService?.activate(licenseInput) ?? (success: false, message: "Service unavailable")
            await MainActor.run {
                activating = false
                if result.0 {
                    appState.licenseKey = licenseInput
                    appState.isPro = true
                    message = "Pro activated!"
                } else {
                    message = result.1
                }
            }
        }
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
