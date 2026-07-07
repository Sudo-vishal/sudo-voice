import SwiftUI
import AppKit

// MARK: - Upgrade Sheet View

/// Modal shown when the free tier is exhausted.
/// MenuBarExtra(.menu) doesn't support `.sheet`, so this view is presented
/// inside a programmatically managed NSWindow (UpgradeWindowController).
struct UpgradeSheet: View {
    @Environment(AppState.self) private var appState

    /// Brand neon cyan #18D1E0 (Rule 58)
    private static let brandCyan = Color(red: 0.094, green: 0.820, blue: 0.878)

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.title2)
                    .foregroundStyle(Self.brandCyan)
                Text("You've hit today's free limit")
                    .font(.title3.bold())
            }

            Text("60 minutes of voice typing today. Reset at midnight.")
                .font(.callout)
                .foregroundStyle(.secondary)

            Divider()

            VStack(spacing: 8) {
                Button(action: { openExternal("https://sudovoice.com/pricing") }) {
                    HStack {
                        Text("Get Pro — $12/month").font(.body.bold())
                        Spacer()
                        Image(systemName: "arrow.up.right")
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(Self.brandCyan.opacity(0.18))
                    .foregroundStyle(Self.brandCyan)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button(action: { openExternal("https://sudovoice.com/pricing#lifetime") }) {
                    HStack {
                        Text("Get Lifetime — $249").font(.body.bold())
                        Spacer()
                        Image(systemName: "arrow.up.right")
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(Self.brandCyan.opacity(0.10))
                    .foregroundStyle(Self.brandCyan)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                Button("I'll enter my key in Settings") {
                    NotificationCenter.default.post(name: .openLicenseSettings, object: nil)
                    UpgradeWindowController.shared.close()
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)

                Button("Maybe later") {
                    UpgradeWindowController.shared.close()
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .frame(width: 380)
    }

    private func openExternal(_ urlString: String) {
        if let url = URL(string: urlString) {
            NSWorkspace.shared.open(url)
        }
    }
}

// MARK: - Window Controller

/// Programmatic window for the upgrade modal.
/// MenuBarExtra(.menu) menus can't host SwiftUI `.sheet`; this is the equivalent.
@MainActor
final class UpgradeWindowController {
    static let shared = UpgradeWindowController()
    private var window: NSWindow?

    private init() {}

    func show() {
        if let existing = window, existing.isVisible {
            existing.makeKeyAndOrderFront(nil)
            NSApplication.shared.activate(ignoringOtherApps: true)
            return
        }

        let view = UpgradeSheet().environment(sharedAppState)
        let hostingView = NSHostingView(rootView: view)

        let w = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 320),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        w.title = "Upgrade SudoVoice"
        w.contentView = hostingView
        w.center()
        w.isReleasedWhenClosed = false
        w.level = .floating
        w.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        self.window = w
    }

    func close() {
        window?.close()
    }
}

// MARK: - Observer

/// Binds AppState.showUpgradePrompt → UpgradeWindowController.show().
/// Started once from SudoVoiceApp.init() after setup() completes.
@MainActor
final class UpgradePromptObserver {
    static let shared = UpgradePromptObserver()
    private var task: Task<Void, Never>?

    private init() {}

    func start(state: AppState) {
        task?.cancel()
        task = Task { @MainActor in
            // Initial check — flag may already be true if exhaustion fired before observer started
            if state.showUpgradePrompt {
                UpgradeWindowController.shared.show()
                state.showUpgradePrompt = false
            }

            // Reactive loop: wake on every showUpgradePrompt mutation
            while !Task.isCancelled {
                await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                    withObservationTracking {
                        _ = state.showUpgradePrompt
                    } onChange: {
                        Task { @MainActor in
                            continuation.resume()
                        }
                    }
                }

                if state.showUpgradePrompt {
                    UpgradeWindowController.shared.show()
                    state.showUpgradePrompt = false
                }
            }
        }
    }
}
