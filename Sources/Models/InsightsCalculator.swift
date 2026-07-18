import Foundation

struct InsightRecord: Identifiable, Equatable {
    let id: UUID
    let text: String
    let timestamp: Date
    let wordCount: Int
    let durationSeconds: Int?
}

struct InsightDay: Identifiable, Equatable {
    let date: Date
    let words: Int
    var id: Date { date }
}

struct InsightStats: Equatable {
    let totalWords: Int
    let averageWPM: Double?
    let dayStreak: Int
    let lastSevenDays: [InsightDay]
}

enum InsightsCalculator {
    static func calculate(
        records: [InsightRecord],
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> InsightStats {
        let totalWords = records.reduce(0) { $0 + $1.wordCount }
        let timedRecords = records.filter { ($0.durationSeconds ?? 0) > 0 }
        let timedWords = timedRecords.reduce(0) { $0 + $1.wordCount }
        let timedSeconds = timedRecords.reduce(0) { $0 + ($1.durationSeconds ?? 0) }
        let averageWPM = timedSeconds > 0
            ? Double(timedWords) / Double(timedSeconds) * 60
            : nil

        let today = calendar.startOfDay(for: now)
        let activeDays = Set(records.map { calendar.startOfDay(for: $0.timestamp) })
        let streakStart: Date? = {
            if activeDays.contains(today) { return today }
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: today),
                  activeDays.contains(yesterday) else { return nil }
            return yesterday
        }()

        var streak = 0
        var cursor = streakStart
        while let day = cursor, activeDays.contains(day) {
            streak += 1
            cursor = calendar.date(byAdding: .day, value: -1, to: day)
        }

        let lastSevenDays = (-6...0).compactMap { offset -> InsightDay? in
            guard let day = calendar.date(byAdding: .day, value: offset, to: today),
                  let nextDay = calendar.date(byAdding: .day, value: 1, to: day) else {
                return nil
            }
            let words = records
                .filter { $0.timestamp >= day && $0.timestamp < nextDay }
                .reduce(0) { $0 + $1.wordCount }
            return InsightDay(date: day, words: words)
        }

        return InsightStats(
            totalWords: totalWords,
            averageWPM: averageWPM,
            dayStreak: streak,
            lastSevenDays: lastSevenDays
        )
    }
}
