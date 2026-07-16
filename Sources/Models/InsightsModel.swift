import Foundation
import Observation

@Observable
@MainActor
final class InsightsModel {
    private(set) var records: [InsightRecord] = []
    private(set) var stats = InsightsCalculator.calculate(records: [])
    private(set) var isLoading = false
    private(set) var isShowingLocalFallback = false

    func load(appState: AppState) async {
        isLoading = true
        defer { isLoading = false }

        if appState.currentUser != nil {
            do {
                // Cap cloud history at the 1,000 most recent dictations for responsive stats.
                let rows = try await SupabaseService.shared.fetchMyTranscripts(limit: 1_000)
                apply(rows.map(Self.cloudRecord))
                isShowingLocalFallback = false
                return
            } catch {
                logToFile("Insights: cloud unavailable — showing this device")
                isShowingLocalFallback = true
            }
        } else {
            isShowingLocalFallback = false
        }

        apply(appState.transcriptionHistory.map(Self.localRecord))
    }

    func loadLocalForTesting(_ entries: [TranscriptionEntry]) {
        isShowingLocalFallback = false
        apply(entries.map(Self.localRecord))
    }

    private func apply(_ newRecords: [InsightRecord]) {
        records = newRecords.sorted { $0.timestamp > $1.timestamp }
        stats = InsightsCalculator.calculate(records: records)
    }

    private static func cloudRecord(_ row: SupabaseService.TranscriptRow) -> InsightRecord {
        let text = row.cleaned_text ?? row.raw_text
        return InsightRecord(
            id: row.id,
            text: text,
            timestamp: row.created_at,
            wordCount: row.word_count ?? text.split(whereSeparator: \.isWhitespace).count,
            durationSeconds: row.duration_seconds
        )
    }

    private static func localRecord(_ entry: TranscriptionEntry) -> InsightRecord {
        InsightRecord(
            id: entry.id,
            text: entry.cleanedText,
            timestamp: entry.timestamp,
            wordCount: entry.cleanedText.split(whereSeparator: \.isWhitespace).count,
            durationSeconds: nil
        )
    }
}
