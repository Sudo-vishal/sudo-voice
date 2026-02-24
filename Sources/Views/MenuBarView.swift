import SwiftUI

struct MenuBarView: View {
    // Use the global directly — avoid @Environment + @Bindable crash
    private var appState: AppState { sharedAppState }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Status
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                Text(appState.statusText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Divider()

            // Last transcription
            if !appState.lastTranscription.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Last")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text(appState.lastTranscription)
                        .font(.body)
                        .lineLimit(4)
                        .textSelection(.enabled)
                }
            }

            Divider()

            // Toggle recording
            Button {
                DispatchQueue.main.async { appState.toggleRecording() }
            } label: {
                Label(
                    appState.isRecording ? "Stop Recording" : "Start Recording",
                    systemImage: appState.isRecording ? "stop.circle.fill" : "record.circle"
                )
            }
            .disabled(!appState.isModelLoaded)

            Divider()

            // Model picker — manual binding, no @Bindable
            Picker("Model", selection: Binding(
                get: { appState.selectedModel },
                set: { newVal in
                    appState.selectedModel = newVal
                    Task { await appState.loadModel() }
                }
            )) {
                ForEach(WhisperModelSize.allCases) { model in
                    Text(model.displayName).tag(model)
                }
            }

            // Toggles — manual bindings
            Toggle("Hindi Mode", isOn: Binding(
                get: { appState.hindiMode },
                set: { appState.hindiMode = $0 }
            ))

            Toggle("Auto-type", isOn: Binding(
                get: { appState.autoTypeEnabled },
                set: { appState.autoTypeEnabled = $0 }
            ))

            // Download progress
            if appState.isModelDownloading {
                ProgressView(value: appState.modelDownloadProgress) {
                    Text("Downloading model...")
                        .font(.caption)
                }
            }

            Divider()

            // Permission warnings
            if PermissionService.microphoneStatus() != .granted {
                Label("Mic access needed", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            if !AutoTypeService.isAccessibilityGranted() {
                Button("Grant Accessibility") {
                    DispatchQueue.main.async {
                        AutoTypeService.promptAccessibilityOnce()
                    }
                }
                .font(.caption)
            }

            Divider()

            // History
            if !appState.transcriptionHistory.isEmpty {
                DisclosureGroup("History") {
                    ForEach(appState.transcriptionHistory.prefix(10)) { entry in
                        Text(entry.text)
                            .font(.caption)
                            .lineLimit(2)
                            .foregroundStyle(.secondary)
                    }
                }
                .font(.caption)

                Divider()
            }

            HStack {
                Button("Settings...") {
                    DispatchQueue.main.async {
                        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                    }
                }
                Spacer()
                Button("Quit") {
                    DispatchQueue.main.async {
                        NSApplication.shared.terminate(nil)
                    }
                }
            }
        }
        .padding()
        .frame(width: 300)
    }

    private var statusColor: Color {
        if appState.isRecording { return .red }
        if appState.isProcessing { return .orange }
        if appState.isModelLoaded { return .green }
        return .gray
    }
}
