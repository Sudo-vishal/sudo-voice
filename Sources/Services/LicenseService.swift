import Foundation

/// Validates Pro licenses via Dodo Payments' public License API.
/// Caches result locally, re-checks every 24h, 7-day offline grace period.
final class LicenseService {

    private let baseURL = "https://live.dodopayments.com"

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

        var request = URLRequest(url: URL(string: "\(baseURL)/licenses/activate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let instanceName = Host.current().localizedName ?? "Mac"
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "license_key": key,
            "name": instanceName
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return (false, "Invalid response")
            }

            if http.statusCode == 201,
               let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let instanceID = json["id"] as? String {
                // Store activation ID for deactivation later
                UserDefaults.standard.set(instanceID, forKey: Keys.activationID)
                cacheResult(true)
                logToFile("License: activated successfully")
                return (true, "License activated!")
            }

            return (false, errorMessage(from: data, fallback: "Activation failed"))
        } catch {
            logToFile("License activation error: \(error.localizedDescription)")
            return (false, "Network error: \(error.localizedDescription)")
        }
    }

    /// Deactivate a license on this device. Frees one of the license's configured device slots.
    /// Clears all cache keys on success — next launch starts cleanly free-tier.
    func deactivate(_ key: String) async -> (success: Bool, message: String) {
        guard !key.isEmpty else { return (false, "No license key provided") }

        let instanceID = UserDefaults.standard.string(forKey: Keys.activationID) ?? ""
        guard !instanceID.isEmpty else {
            return (false, "No activation ID — already deactivated?")
        }

        var request = URLRequest(url: URL(string: "\(baseURL)/licenses/deactivate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "license_key": key,
            "license_key_instance_id": instanceID
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return (false, "Invalid response")
            }

            if http.statusCode == 200 {
                // Full cache reset — next launch starts cleanly free-tier.
                UserDefaults.standard.removeObject(forKey: Keys.activationID)
                UserDefaults.standard.removeObject(forKey: Keys.cachedValid)
                UserDefaults.standard.removeObject(forKey: Keys.lastValidation)
                logToFile("License: deactivated successfully")
                return (true, "License deactivated")
            }

            return (false, errorMessage(from: data, fallback: "Deactivation failed"))
        } catch {
            logToFile("License deactivation error: \(error.localizedDescription)")
            return (false, "Network error: \(error.localizedDescription)")
        }
    }

    // MARK: - Online Validation

    private func validateOnline(_ key: String) async throws -> Bool {
        var request = URLRequest(url: URL(string: "\(baseURL)/licenses/validate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let instanceID = UserDefaults.standard.string(forKey: Keys.activationID) ?? ""
        var body: [String: Any] = ["license_key": key]
        if !instanceID.isEmpty {
            body["license_key_instance_id"] = instanceID
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse,
              http.statusCode == 200,
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw LicenseError.badResponse
        }

        let valid = json["valid"] as? Bool ?? false

        logToFile("License: online validation — valid=\(valid)")

        return valid
    }

    private func errorMessage(from data: Data, fallback: String) -> String {
        guard !data.isEmpty,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return fallback
        }

        if let message = json["message"] as? String {
            return message
        }
        if let error = json["error"] as? String {
            return error
        }
        if let error = json["error"] as? [String: Any],
           let message = error["message"] as? String {
            return message
        }
        return fallback
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
