import SwiftUI
import AppKit

/// Manages a standalone settings window (works with .accessory activation policy)
private final class SettingsWindowManager {
    static let shared = SettingsWindowManager()
    private var window: NSWindow?

    func open() {
        if let existing = window, existing.isVisible {
            existing.makeKeyAndOrderFront(nil)
            NSApplication.shared.activate(ignoringOtherApps: true)
            return
        }

        let settingsView = SettingsView()
            .environment(sharedAppState)

        let hostingView = NSHostingView(rootView: settingsView)
        let w = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 560, height: 520),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        w.title = "IndianWhisper Settings"
        w.contentView = hostingView
        w.center()
        w.isReleasedWhenClosed = false
        w.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        self.window = w
    }
}

private func openSettings() {
    SettingsWindowManager.shared.open()
}

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

        Toggle("Smart Punctuation", isOn: Binding(
            get: { appState.smartPunctuationEnabled },
            set: { appState.smartPunctuationEnabled = $0 }
        ))

        Toggle("Scratch That", isOn: Binding(
            get: { appState.scratchThatEnabled },
            set: { appState.scratchThatEnabled = $0 }
        ))

        if appState.llmCleanupEnabled && !appState.hasAnyLLMKey {
            Button("Set API Key (\(appState.selectedLLMProvider.displayName))...") {
                openSettings()
            }
        }

        Divider()

        // Recent transcriptions
        if !appState.transcriptionHistory.isEmpty {
            Text("Recent")
                .font(.caption)
                .foregroundStyle(.secondary)

            ForEach(appState.transcriptionHistory.prefix(5)) { entry in
                Button(action: {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(entry.cleanedText, forType: .string)
                }) {
                    Text(entry.cleanedText)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
            }

            if appState.transcriptionHistory.count > 5 {
                Button("View All History...") {
                    openSettings()
                }
            }

            Divider()
        }

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
            openSettings()
        }
        .keyboardShortcut(",")

        Button("Quit") {
            NSApplication.shared.terminate(nil)
        }
        .keyboardShortcut("q")
    }
}
