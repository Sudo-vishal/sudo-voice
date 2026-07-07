import SwiftUI
import AppKit

/// Persistent log location — ~/Library/Logs/SudoVoice/debug.log
/// (was /tmp, which macOS wipes on restart — support debugging kept losing history)
let logFilePath: String = {
    let fm = FileManager.default
    let dir = fm.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Logs/SudoVoice", isDirectory: true)
    try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir.appendingPathComponent("debug.log").path
}()

func logToFile(_ msg: String) {
    let line = "[\(Date())] \(msg)\n"
    if let handle = FileHandle(forWritingAtPath: logFilePath) {
        handle.seekToEndOfFile()
        handle.write(line.data(using: .utf8)!)
        handle.closeFile()
    } else {
        FileManager.default.createFile(atPath: logFilePath, contents: line.data(using: .utf8))
    }
}

/// Shared app state accessible globally
let sharedAppState = AppState()

@main
struct SudoVoiceApp: App {

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
        Window("Welcome to SudoVoice", id: "onboarding") {
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
        if window.title.contains("SudoVoice") || window.title.contains("Welcome") {
            window.makeKeyAndOrderFront(nil)
            NSApplication.shared.activate(ignoringOtherApps: true)
            return
        }
    }
    // Fallback: open via window group ID
    if let url = URL(string: "sudovoice://onboarding") {
        NSWorkspace.shared.open(url)
    }
}
