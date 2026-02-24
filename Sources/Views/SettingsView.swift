import SwiftUI

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
        }
        .frame(width: 420, height: 300)
    }
}

// MARK: - General

private struct GeneralTab: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        Form {
            HStack {
                Text("Recording Hotkey:")
                Text("Cmd + D")
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .font(.system(.body, design: .monospaced))
            }

            Toggle("Hindi Mode (Hindi/Hinglish → English)", isOn: $state.hindiMode)
            Toggle("Auto-type transcribed text", isOn: $state.autoTypeEnabled)

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
