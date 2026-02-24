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
struct WhisperAiwithDhruvApp: App {

    init() {
        NSApplication.shared.setActivationPolicy(.accessory)
        logToFile("App init called")
        Task.detached {
            do {
                logToFile("Starting setup...")
                await sharedAppState.setup()
                logToFile("Setup done. Model loaded: \(sharedAppState.isModelLoaded)")
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
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
                .environment(sharedAppState)
        }
    }
}
