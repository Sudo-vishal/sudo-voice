import Foundation
import AppKit

/// Checks indianwhisper.com for new app versions and notifies the user.
/// No auto-install (no Apple Developer cert). Instead: notification → browser → new DMG.
final class UpdateService {

    static let shared = UpdateService()

    private let apiURL = "https://indianwhisper.com/api/update/check"
    private let fallbackURL = "https://indianwhisper.com/releases/latest.json"
    private let checkInterval: TimeInterval = 6 * 3600 // 6 hours

    // MARK: - State

    var updateAvailable = false
    var latestVersion = ""
    var releaseNotes = ""
    var downloadURL = ""

    /// Current app version from Info.plist
    var currentVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    // MARK: - Public API

    /// Check for updates. Throttled to once per 6 hours unless forced.
    func checkForUpdates(force: Bool = false) async {
        if !force {
            if let lastCheck = UserDefaults.standard.object(forKey: "updateLastCheckDate") as? Date,
               Date().timeIntervalSince(lastCheck) < checkInterval {
                return
            }
        }

        UserDefaults.standard.set(Date(), forKey: "updateLastCheckDate")

        guard let manifest = await fetchManifest() else {
            logToFile("Update check: no manifest fetched (offline or error)")
            return
        }

        if isNewer(manifest.version, than: currentVersion) {
            // Check if user skipped this version
            let skipped = UserDefaults.standard.string(forKey: "updateSkippedVersion") ?? ""
            if manifest.version == skipped && !force {
                logToFile("Update check: v\(manifest.version) available but skipped by user")
                return
            }

            updateAvailable = true
            latestVersion = manifest.version
            releaseNotes = manifest.releaseNotes
            downloadURL = manifest.downloadURL
            logToFile("Update available: v\(manifest.version) (current: v\(currentVersion))")
        } else {
            logToFile("Update check: up to date (v\(currentVersion))")
        }
    }

    /// Show native macOS alert with update info
    @MainActor
    func showUpdateAlert() {
        guard updateAvailable else { return }

        let alert = NSAlert()
        alert.messageText = "IndianWhisper v\(latestVersion) Available"
        alert.informativeText = "\(releaseNotes)\n\nYou're currently on v\(currentVersion)."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "Download Update")
        alert.addButton(withTitle: "Later")
        alert.addButton(withTitle: "Skip This Version")

        // Bring app to front for alert
        NSApplication.shared.activate(ignoringOtherApps: true)

        let response = alert.runModal()
        switch response {
        case .alertFirstButtonReturn:
            if let url = URL(string: downloadURL) {
                NSWorkspace.shared.open(url)
            }
        case .alertThirdButtonReturn:
            UserDefaults.standard.set(latestVersion, forKey: "updateSkippedVersion")
            updateAvailable = false
            logToFile("User skipped v\(latestVersion)")
        default:
            break // "Later" — will check again in 6 hours
        }
    }

    /// Show "up to date" message (for manual check)
    @MainActor
    func showUpToDateMessage() {
        let alert = NSAlert()
        alert.messageText = "You're Up to Date"
        alert.informativeText = "IndianWhisper v\(currentVersion) is the latest version."
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        NSApplication.shared.activate(ignoringOtherApps: true)
        alert.runModal()
    }

    // MARK: - Version Comparison

    /// Returns true if remote version is newer than local (semantic versioning)
    func isNewer(_ remote: String, than local: String) -> Bool {
        let r = remote.split(separator: ".").compactMap { Int($0) }
        let l = local.split(separator: ".").compactMap { Int($0) }

        for i in 0..<max(r.count, l.count) {
            let rv = i < r.count ? r[i] : 0
            let lv = i < l.count ? l[i] : 0
            if rv > lv { return true }
            if rv < lv { return false }
        }
        return false
    }

    // MARK: - Network

    private func fetchManifest() async -> UpdateManifest? {
        let v = currentVersion
        let os = ProcessInfo.processInfo.operatingSystemVersionString

        // Try API route first (with analytics), then static fallback
        let urls = [
            "\(apiURL)?v=\(v)&os=\(os.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? os)",
            fallbackURL,
        ]

        for urlString in urls {
            guard let url = URL(string: urlString) else { continue }
            do {
                var request = URLRequest(url: url)
                request.timeoutInterval = 10
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { continue }
                return try JSONDecoder().decode(UpdateManifest.self, from: data)
            } catch {
                logToFile("Update fetch failed (\(urlString)): \(error.localizedDescription)")
                continue
            }
        }
        return nil
    }
}

// MARK: - Manifest Model

struct UpdateManifest: Decodable {
    let version: String
    let downloadURL: String
    let releaseNotes: String
    let minimumOS: String?
    let releaseDate: String?
    let sha256: String?
}
