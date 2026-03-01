import SwiftUI

struct MenuBarView: View {
    private var appState: AppState { sharedAppState }

    var body: some View {
        // Status
        Text(appState.statusText)

        if !appState.lastTranscription.isEmpty {
            Text(appState.lastTranscription)
                .lineLimit(3)
        }

        // Free tier usage
        if !appState.isPro {
            Text("\(String(format: "%.0f", appState.freeMinutesRemaining)) min remaining today")
                .font(.caption)
        }

        Divider()

        let hotkeyLabel = appState.hotkeyService?.displayString ?? "Cmd + D"
        Button(appState.isRecording ? "Stop Recording (\(hotkeyLabel))" : "Start Recording (\(hotkeyLabel))") {
            appState.toggleRecording()
        }
        .disabled(!appState.isModelLoaded || appState.isFreeTierExhausted)

        if appState.isFreeTierExhausted {
            Text("Daily limit reached. Upgrade to Pro!")
                .foregroundStyle(.red)
                .font(.caption)
        }

        Divider()

        Picker("Model", selection: Binding(
            get: { appState.selectedModel },
            set: { newVal in
                guard newVal.isFree || appState.isPro else { return }
                appState.selectedModel = newVal
                Task { await appState.loadModel() }
            }
        )) {
            ForEach(WhisperModelSize.allCases) { model in
                HStack {
                    Text(model.displayName)
                    if !model.isFree && !appState.isPro {
                        Text("(PRO)")
                    }
                }
                .tag(model)
            }
        }

        Toggle("Hindi Mode", isOn: Binding(
            get: { appState.hindiMode },
            set: { appState.hindiMode = $0 }
        ))

        Toggle("Auto-type", isOn: Binding(
            get: { appState.autoTypeEnabled },
            set: { appState.autoTypeEnabled = $0 }
        ))

        Toggle("LLM Cleanup", isOn: Binding(
            get: { appState.llmCleanupEnabled },
            set: { appState.llmCleanupEnabled = $0 }
        ))

        if appState.llmCleanupEnabled && appState.groqApiKey.isEmpty && appState.openRouterApiKey.isEmpty {
            Button("Set API Key (Groq/OpenRouter)...") {
                NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
            }
        }

        Divider()

        if !AutoTypeService.isAccessibilityGranted() {
            Button("Grant Accessibility") {
                AutoTypeService.promptAccessibilityOnce()
            }
        }

        // Pro status
        if appState.isPro {
            Text("Pro")
                .font(.caption)
        } else {
            Button("Upgrade to Pro...") {
                if let url = URL(string: "https://indianwhisper.com") {
                    NSWorkspace.shared.open(url)
                }
            }
        }

        Button("Settings...") {
            NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
        }
        .keyboardShortcut(",")

        Button("Quit") {
            NSApplication.shared.terminate(nil)
        }
        .keyboardShortcut("q")
    }
}
