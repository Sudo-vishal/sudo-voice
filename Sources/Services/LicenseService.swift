import Foundation

/// Validates Pro licenses via Lemon Squeezy API.
/// Caches result locally, re-checks every 24h, 7-day offline grace period.
final class LicenseService {

    private let validateURL = "https://api.lemonsqueezy.com/v1/licenses/validate"
    private let activateURL = "https://api.lemonsqueezy.com/v1/licenses/activate"

    // MARK: - Cache Keys

    private enum Keys {
        static let lastValidation = "license_lastValidation"       // ISO8601 date
        static let cachedValid = "license_cachedValid"             // Bool
        static let activationID = "license_activationID"           // String
        static let offlineGraceDays = 7
        static let revalidationInterval: TimeInterval = 86400      // 24h
    }

    // MARK: - Public API

    /// Validate a license key. Returns true if Pro.
    /// Uses cache if validated within 24h, offline grace period of 7 days.
    func validate(_ key: String) async -> Bool {
        guard !key.isEmpty else { return false }

        // Check cache first
        if let cached = cachedResult(), !needsRevalidation() {
            logToFile("License: using cached result (valid: \(cached))")
            return cached
        }

        // Try online validation
        do {
            let valid = try await validateOnline(key)
            cacheResult(valid)
            return valid
        } catch {
            logToFile("License: online validation failed — \(error.localizedDescription)")
            // Offline grace: if previously validated, allow for 7 days
            if let lastDate = lastValidationDate(),
               let cached = cachedResult(),
               cached,
               Date().timeIntervalSince(lastDate) < Double(Keys.offlineGraceDays) * 86400 {
                logToFile("License: offline grace period active (\(Keys.offlineGraceDays) days)")
                return true
            }
            return false
        }
    }

    /// Activate a license key on this device. Call once after purchase.
    func activate(_ key: String) async -> (success: Bool, message: String) {
        guard !key.isEmpty else { return (false, "No license key provided") }

        var request = URLRequest(url: URL(string: activateURL)!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let instanceName = Host.current().localizedName ?? "Mac"
        let body = "license_key=\(key)&instance_name=\(instanceName)"
        request.httpBody = body.data(using: .utf8)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return (false, "Invalid response")
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return (false, "Bad response format")
            }

            let activated = json["activated"] as? Bool ?? false
            let msg = json["error"] as? String ?? (activated ? "License activated!" : "Activation failed")

            if activated {
                // Store activation ID for deactivation later
                if let instance = json["instance"] as? [String: Any],
                   let id = instance["id"] as? String {
                    UserDefaults.standard.set(id, forKey: Keys.activationID)
                }
                cacheResult(true)
                logToFile("License: activated successfully")
            } else if http.statusCode == 200 {
                // Already activated — validate instead
                let valid = (json["valid"] as? Bool) ?? false
                if valid {
                    cacheResult(true)
                    logToFile("License: already activated, valid")
                    return (true, "License already activated")
                }
            }

            return (activated, msg)
        } catch {
            logToFile("License activation error: \(error.localizedDescription)")
            return (false, "Network error: \(error.localizedDescription)")
        }
    }

    /// Deactivate a license on this device. Frees the device slot on the LS license
    /// (3-device limit means user needs to deactivate before activating on a 4th Mac).
    /// Clears all cache keys on success — next launch starts cleanly free-tier.
    func deactivate(_ key: String) async -> (success: Bool, message: String) {
        guard !key.isEmpty else { return (false, "No license key provided") }

        let deactivateURL = "https://api.lemonsqueezy.com/v1/licenses/deactivate"
        let instanceID = UserDefaults.standard.string(forKey: Keys.activationID) ?? ""
        guard !instanceID.isEmpty else {
            return (false, "No activation ID — already deactivated?")
        }

        var request = URLRequest(url: URL(string: deactivateURL)!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let body = "license_key=\(key)&instance_id=\(instanceID)"
        request.httpBody = body.data(using: .utf8)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return (false, "Bad response format")
            }

            let deactivated = json["deactivated"] as? Bool ?? false
            let msg = json["error"] as? String ?? (deactivated ? "License deactivated" : "Deactivation failed")

            if deactivated {
                // Full cache reset — next launch starts cleanly free-tier.
                UserDefaults.standard.removeObject(forKey: Keys.activationID)
                UserDefaults.standard.removeObject(forKey: Keys.cachedValid)
                UserDefaults.standard.removeObject(forKey: Keys.lastValidation)
                logToFile("License: deactivated successfully")
            }

            return (deactivated, msg)
        } catch {
            logToFile("License deactivation error: \(error.localizedDescription)")
            return (false, "Network error: \(error.localizedDescription)")
        }
    }

    // MARK: - Online Validation

    private func validateOnline(_ key: String) async throws -> Bool {
        var request = URLRequest(url: URL(string: validateURL)!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let instanceID = UserDefaults.standard.string(forKey: Keys.activationID) ?? ""
        var body = "license_key=\(key)"
        if !instanceID.isEmpty {
            body += "&instance_id=\(instanceID)"
        }
        request.httpBody = body.data(using: .utf8)

        let (data, _) = try await URLSession.shared.data(for: request)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw LicenseError.badResponse
        }

        let valid = json["valid"] as? Bool ?? false
        let status = (json["license_key"] as? [String: Any])?["status"] as? String ?? "unknown"

        logToFile("License: online validation — valid=\(valid), status=\(status)")

        // Active or inactive (not expired/disabled) = valid
        return valid && (status == "active" || status == "inactive")
    }

    // MARK: - Cache

    private func cacheResult(_ valid: Bool) {
        UserDefaults.standard.set(valid, forKey: Keys.cachedValid)
        UserDefaults.standard.set(ISO8601DateFormatter().string(from: Date()), forKey: Keys.lastValidation)
    }

    private func cachedResult() -> Bool? {
        guard UserDefaults.standard.object(forKey: Keys.cachedValid) != nil else { return nil }
        return UserDefaults.standard.bool(forKey: Keys.cachedValid)
    }

    private func lastValidationDate() -> Date? {
        guard let str = UserDefaults.standard.string(forKey: Keys.lastValidation) else { return nil }
        return ISO8601DateFormatter().date(from: str)
    }

    private func needsRevalidation() -> Bool {
        guard let lastDate = lastValidationDate() else { return true }
        return Date().timeIntervalSince(lastDate) > Keys.revalidationInterval
    }

    // MARK: - Error

    enum LicenseError: Error {
        case badResponse
    }
}
