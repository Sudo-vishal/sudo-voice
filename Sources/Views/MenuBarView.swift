import SwiftUI
import AppKit

extension Notification.Name {
    /// Posted by UpgradeSheet's "I'll enter my key in Settings" button.
    /// SettingsWindowManager opens the Settings window; SettingsView switches to the License tab.
    static let openLicenseSettings = Notification.Name("indianwhisper.openLicenseSettings")
}

/// Force-instantiates `SettingsWindowManager.shared` so its NotificationCenter observer
/// is live before the first UpgradeSheet can fire. Called once from app init.
@MainActor
func bootstrapSettingsObserver() {
    _ = SettingsWindowManager.shared
}

/// Manages a standalone settings window (works with .accessory activation policy)
private final class SettingsWindowManager {
    static let shared = SettingsWindowManager()
    private var window: NSWindow?
    private var observer: NSObjectProtocol?

    private init() {
        observer = NotificationCenter.default.addObserver(
            forName: .openLicenseSettings,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.open()
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

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

        Text("Community Edition")
            .font(.caption)
            .foregroundStyle(.secondary)

        Divider()

        let hotkeyLabel = appState.hotkeyService?.displayString ?? "Cmd + D"
        Button(appState.isRecording ? "Stop Recording (\(hotkeyLabel))" : "Start Recording (\(hotkeyLabel))") {
            appState.toggleRecording()
        }
        .disabled(!appState.isModelLoaded)

        Divider()

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

        Toggle("Cloud Transcription", isOn: Binding(
            get: { appState.useCloudTranscription },
            set: { appState.useCloudTranscription = $0 }
        ))

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

        if UpdateService.shared.updateAvailable {
            Divider()
            Button("Update Available: v\(UpdateService.shared.latestVersion)") {
                Task { @MainActor in
                    UpdateService.shared.showUpdateAlert()
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
