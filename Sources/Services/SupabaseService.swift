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

    // MARK: - Auth state

    /// Currently signed-in user, or nil if signed out / no client.
    /// Hits the SDK's local Keychain-backed session — no network call.
    var currentUser: User? {
        get async {
            guard let client else { return nil }
            return try? await client.auth.session.user
        }
    }

    /// Send a 6-digit OTP code to the user's email. Returns true on send success.
    /// `shouldCreateUser: true` so OTP works as both sign-up AND sign-in (no separate signup screen).
    func sendSignInCode(email: String) async -> Bool {
        guard let client else { return false }
        do {
            try await client.auth.signInWithOTP(
                email: email,
                shouldCreateUser: true
            )
            logToFile("SupabaseService: OTP sent to \(email)")
            return true
        } catch {
            logToFile("SupabaseService: OTP send failed — \(error.localizedDescription)")
            return false
        }
    }

    /// Verify the 6-digit code. On success the SDK persists the session in Keychain via
    /// its built-in storage adapter — no manual Keychain wrapper needed here.
    /// Returns the User on success, nil on failure.
    func verifySignInCode(email: String, code: String) async -> User? {
        guard let client else { return nil }
        do {
            let session = try await client.auth.verifyOTP(
                email: email,
                token: code,
                type: .email
            )
            logToFile("SupabaseService: signed in as \(session.user.email ?? "<no email>")")
            return session.user
        } catch {
            logToFile("SupabaseService: OTP verify failed — \(error.localizedDescription)")
            return nil
        }
    }

    /// Sign out, clear local Supabase session.
    func signOut() async {
        guard let client else { return }
        do {
            try await client.auth.signOut()
            logToFile("SupabaseService: signed out")
        } catch {
            logToFile("SupabaseService: signOut error — \(error.localizedDescription)")
        }
    }

    /// Async stream of auth state changes (sign-in, sign-out, token refresh).
    /// AppState observes this to keep `currentUser` live across the app.
    func authStateChanges() -> AsyncStream<AuthChangeEvent> {
        guard let client else { return AsyncStream { _ in } }
        return AsyncStream { continuation in
            Task {
                for await (event, _) in client.auth.authStateChanges {
                    continuation.yield(event)
                }
            }
        }
    }

    // MARK: - Transcripts

    /// Save a transcript to Supabase. Fire-and-forget — caller should not block on this.
    /// Returns true on success, false on any failure (logs the error).
    /// RLS policy `auth.uid() = user_id` auto-enforces ownership; we never set user_id manually.
    func saveTranscript(
        rawText: String,
        cleanedText: String?,
        language: String?,
        modelUsed: String?,
        llmCleanupModel: String?,
        durationSeconds: Int?,
        wordCount: Int?,
        charCount: Int?
    ) async -> Bool {
        guard let client else { return false }

        let titleSource = cleanedText ?? rawText
        let title = String(titleSource.prefix(60)).trimmingCharacters(in: .whitespacesAndNewlines)

        struct TranscriptInsert: Encodable {
            let source: String
            let kind: String
            let title: String?
            let raw_text: String
            let cleaned_text: String?
            let language: String?
            let model_used: String?
            let llm_cleanup_model: String?
            let duration_seconds: Int?
            let word_count: Int?
            let char_count: Int?
        }

        let row = TranscriptInsert(
            source: "mac",
            kind: "dictation",
            title: title.isEmpty ? nil : title,
            raw_text: rawText,
            cleaned_text: cleanedText,
            language: language,
            model_used: modelUsed,
            llm_cleanup_model: llmCleanupModel,
            duration_seconds: durationSeconds,
            word_count: wordCount,
            char_count: charCount
        )

        do {
            try await client
                .from("transcripts")
                .insert(row)
                .execute()
            logToFile("SupabaseService: saved transcript (\(charCount ?? 0) chars)")
            return true
        } catch {
            logToFile("SupabaseService: save transcript failed — \(error.localizedDescription)")
            return false
        }
    }

    /// Fetch the signed-in user's transcripts (most recent first).
    /// Throws on connectivity/auth errors so callers can distinguish offline fallback
    /// from a real signed-in account with no transcripts.
    func fetchMyTranscripts(limit: Int = 50) async throws -> [TranscriptRow] {
        guard let client else { throw SupabaseServiceError.unavailable }
        do {
            return try await client
                .from("transcripts")
                .select("id, title, raw_text, cleaned_text, language, duration_seconds, word_count, char_count, created_at")
                .order("created_at", ascending: false)
                .limit(limit)
                .execute()
                .value
        } catch {
            logToFile("SupabaseService: fetch transcripts failed — \(error.localizedDescription)")
            throw error
        }
    }

    /// Delete a transcript by id. RLS enforces user ownership.
    func deleteTranscript(id: UUID) async -> Bool {
        guard let client else { return false }
        do {
            try await client
                .from("transcripts")
                .delete()
                .eq("id", value: id)
                .execute()
            return true
        } catch {
            logToFile("SupabaseService: delete transcript failed — \(error.localizedDescription)")
            return false
        }
    }

    /// Lightweight DTO for fetching. Add fields as needed by HistoryTab.
    struct TranscriptRow: Decodable, Identifiable {
        let id: UUID
        let title: String?
        let raw_text: String
        let cleaned_text: String?
        let language: String?
        let duration_seconds: Int?
        let word_count: Int?
        let char_count: Int?
        let created_at: Date
    }
}

enum SupabaseServiceError: LocalizedError {
    case unavailable

    var errorDescription: String? {
        "Cloud history is unavailable."
    }
}
