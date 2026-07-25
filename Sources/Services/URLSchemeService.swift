import AppKit
import Foundation

/// One-click activation deep link: `indianwhisper://activate?key=<license-key>`
///
/// This file only parses the URL and hands the key to the existing Settings
/// License-tab path (`LicenseService.activate`). It never activates on its own and
/// never bypasses validation — the user always ends up looking at the License tab
/// with the same success/error message the manual paste flow shows.

// MARK: - Inbox

/// Parking spot for a deep-linked key between "URL arrived" and "License tab is on
/// screen and ready to run it". Plain lock-guarded class (no actor isolation) so the
/// Settings window's `@State` initializer can read it while deciding its first tab.
final class LicenseActivationInbox: @unchecked Sendable {
    enum Request {
        case key(String)
        case invalidLink(String)   // user-visible reason, shown as an error in the License tab
    }

    static let shared = LicenseActivationInbox()

    private let lock = NSLock()
    private var pending: Request?

    var hasPending: Bool {
        lock.lock(); defer { lock.unlock() }
        return pending != nil
    }

    func store(_ request: Request) {
        lock.lock(); defer { lock.unlock() }
        pending = request
    }

    /// Returns the pending request once, then clears it — activation can never
    /// fire twice off a single link.
    func take() -> Request? {
        lock.lock(); defer { lock.unlock() }
        let request = pending
        pending = nil
        return request
    }
}

extension Notification.Name {
    /// Posted when a deep-linked key is parked in `LicenseActivationInbox` and the
    /// License tab should pick it up. The tab also drains the inbox in `onAppear`,
    /// so it does not matter which of the two happens first.
    static let licenseActivationRequested = Notification.Name("indianwhisper.licenseActivationRequested")
}

// MARK: - Handler

/// AppKit delivers `indianwhisper://` opens here — both when the app is already
/// running and when macOS cold-launches it because of the link. (An
/// NSAppleEventManager kAEGetURL handler registered from `App.init` does *not* work:
/// AppKit installs its own handler later in launch and silently replaces it.)
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            URLSchemeHandler.shared.handle(url)
        }
    }
}

@MainActor
final class URLSchemeHandler: NSObject {
    static let shared = URLSchemeHandler()

    /// Dodo license keys are UUIDs (36 chars). The bounds and charset only exist to
    /// drop obviously malformed links before they reach the network.
    private static let allowedKeyCharacters = CharacterSet(
        charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    )
    private static let keyLengthRange = 8...128

    func handle(_ url: URL) {
        guard url.scheme?.lowercased() == "indianwhisper" else { return }
        guard url.host?.lowercased() == "activate" else {
            // e.g. indianwhisper://onboarding — not ours, stay silent.
            logToFile("URL scheme: ignored non-activation link (host=\(url.host ?? "nil"))")
            return
        }

        // URLComponents percent-decodes the value for us.
        let raw = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first { $0.name.lowercased() == "key" }?
            .value ?? ""
        let key = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !key.isEmpty else {
            logToFile("URL scheme: activation link had no key — showing License tab")
            surface(.invalidLink("That activation link had no license key. Paste your key below instead."))
            return
        }

        guard Self.keyLengthRange.contains(key.count),
              key.unicodeScalars.allSatisfy({ Self.allowedKeyCharacters.contains($0) }) else {
            logToFile("URL scheme: activation link key malformed (\(key.count) chars) — showing License tab")
            surface(.invalidLink("That activation link's license key looks malformed. Paste your key below instead."))
            return
        }

        logToFile("URL scheme: activation link received — opening License tab")
        surface(.key(key))
    }

    // MARK: - Private

    /// Park the request, bring the License tab up, then ask it to run.
    private func surface(_ request: LicenseActivationInbox.Request) {
        LicenseActivationInbox.shared.store(request)
        NotificationCenter.default.post(name: .openLicenseSettings, object: nil)

        // The tab drains the inbox in `onAppear` (fresh window / tab switch). This
        // ping covers the case where the License tab was already on screen, and runs
        // one turn later so SwiftUI has mounted it either way.
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .licenseActivationRequested, object: nil)
        }
    }
}
