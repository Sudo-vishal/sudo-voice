import Foundation
import Supabase

/// Cloud sync for IndianWhisper — auth, telemetry, transcript save.
/// Stub in D-004. Real methods land in D-005+.
final class SupabaseService {

    static let shared = SupabaseService()

    private let client: SupabaseClient?

    private init() {
        let url = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String
            ?? ProcessInfo.processInfo.environment["SUPABASE_URL"]
        let key = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String
            ?? ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]

        guard let urlStr = url, let key = key,
              let url = URL(string: urlStr), !key.isEmpty else {
            self.client = nil
            logToFile("SupabaseService: no config — running offline-only")
            return
        }

        self.client = SupabaseClient(supabaseURL: url, supabaseKey: key)
        logToFile("SupabaseService: initialized (url=\(urlStr))")
    }

    /// Health check stub. Real network call in D-005.
    func ping() async -> Bool {
        return client != nil
    }
}
