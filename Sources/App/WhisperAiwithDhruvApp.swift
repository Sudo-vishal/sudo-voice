import SwiftUI
import AppKit

func logToFile(_ msg: String) {
    let line = "[\(Date())] \(msg)\n"
    let path = "/tmp/whisper_debug.log"
    if let handle = FileHandle(forWritingAtPath: path) {
        handle.seekToEndOfFile()
        handle.write(line.data(using: .utf8)!)
        handle.closeFile()
    } else {
        FileManager.default.createFile(atPath: path, contents: line.data(using: .utf8))
    }
}

/// Shared app state accessible globally
let sharedAppState = AppState()

@main
struct IndianWhisperApp: App {

    init() {
        NSApplication.shared.setActivationPolicy(.accessory)
        logToFile("App init called")
        _ = SupabaseService.shared
        bootstrapSettingsObserver()
        Task.detached {
            do {
                logToFile("Starting setup...")
                await sharedAppState.setup()
                logToFile("Setup done. Model loaded: \(sharedAppState.isModelLoaded)")

                await MainActor.run {
                    UpgradePromptObserver.shared.start(state: sharedAppState)
                }

                // Show onboarding if first launch
                if !sharedAppState.hasCompletedOnboarding {
                    await MainActor.run {
                        showOnboarding()
                    }
                }
            } catch {
                logToFile("SETUP ERROR: \(error)")
            }
        }
    }

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
        } label: {
            Image(systemName: sharedAppState.menuBarIconName)
        }
        .menuBarExtraStyle(.menu)

        Settings {
            SettingsView()
                .environment(sharedAppState)
                .onDisappear {
                    // Go back to accessory mode (no dock icon) when settings closes
                    NSApplication.shared.setActivationPolicy(.accessory)
                }
        }

        // Onboarding window
        Window("Welcome to IndianWhisper", id: "onboarding") {
            OnboardingView()
                .environment(sharedAppState)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
    }
}

/// Show onboarding window
@MainActor
private func showOnboarding() {
    NSApplication.shared.setActivationPolicy(.regular)
    for window in NSApplication.shared.windows {
        if window.title.contains("IndianWhisper") || window.title.contains("Welcome") {
            window.makeKeyAndOrderFront(nil)
            NSApplication.shared.activate(ignoringOtherApps: true)
            return
        }
    }
    // Fallback: open via window group ID
    if let url = URL(string: "indianwhisper://onboarding") {
        NSWorkspace.shared.open(url)
    }
}
