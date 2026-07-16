import AppKit
import Charts
import SwiftUI

struct HomeTab: View {
    @Environment(AppState.self) private var appState
    @State private var model = InsightsModel()
    @State private var searchText = ""
    @State private var copiedID: UUID?

    private let brandCyan = Color(red: 24 / 255, green: 209 / 255, blue: 224 / 255)

    private var visibleRecords: [InsightRecord] {
        let matching: [InsightRecord]
        if searchText.isEmpty {
            matching = model.records
        } else {
            let query = searchText.localizedLowercase
            matching = model.records.filter { $0.text.localizedLowercase.contains(query) }
        }
        return Array(matching.prefix(20))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header

                if model.records.isEmpty && !model.isLoading {
                    emptyState
                } else {
                    statRow
                    weeklyChart
                    recentDictations
                }
            }
            .padding(22)
        }
        .task(id: appState.currentUser?.id) {
            await model.load(appState: appState)
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Your voice, at a glance")
                    .font(.title2.bold())
                Text("Every dictation adds to your momentum.")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if model.isLoading {
                ProgressView()
                    .controlSize(.small)
            } else if model.isShowingLocalFallback {
                Label("Offline — showing this device", systemImage: "wifi.slash")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var statRow: some View {
        HStack(spacing: 12) {
            statCard(
                title: "Total words",
                value: model.stats.totalWords.formatted(),
                icon: "text.word.spacing"
            )
            statCard(
                title: "Avg WPM",
                value: model.stats.averageWPM.map { Int($0.rounded()).formatted() } ?? "—",
                icon: "speedometer"
            )
            statCard(
                title: "Day streak",
                value: model.stats.dayStreak.formatted(),
                icon: "calendar"
            )
        }
    }

    private func statCard(title: String, value: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: icon)
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(brandCyan)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(brandCyan.opacity(0.18), lineWidth: 1)
        }
    }

    private var weeklyChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This week")
                .font(.headline)

            Chart(model.stats.lastSevenDays) { day in
                BarMark(
                    x: .value("Day", day.date, unit: .day),
                    y: .value("Words", day.words)
                )
                .foregroundStyle(brandCyan.gradient)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.weekday(.narrow))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 150)
        }
        .padding(16)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private var recentDictations: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Recent dictations")
                    .font(.headline)
                Spacer()
                TextField("Search dictations…", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 230)
            }

            if visibleRecords.isEmpty {
                Text("No matching dictations.")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 80)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(visibleRecords) { record in
                        Button {
                            copy(record)
                        } label: {
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(record.text)
                                        .foregroundStyle(.primary)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)

                                    HStack(spacing: 8) {
                                        TimelineView(.periodic(from: .now, by: 30)) { context in
                                            Text(Self.relativeTimestamp(record.timestamp, now: context.date))
                                        }
                                        Text("•")
                                        Text("\(record.wordCount) words")
                                    }
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                }
                                Spacer()
                                HStack(spacing: 5) {
                                    if copiedID == record.id {
                                        Text("Copied")
                                            .font(.caption)
                                    }
                                    Image(systemName: copiedID == record.id ? "checkmark.circle.fill" : "doc.on.doc")
                                }
                                .foregroundStyle(copiedID == record.id ? brandCyan : .secondary)
                            }
                            .padding(.vertical, 11)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if record.id != visibleRecords.last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 48))
                .foregroundStyle(brandCyan)
            Text("Your insights start with your first dictation")
                .font(.title3.bold())
            Text("Hold ⌥, speak, release — your stats build from your first dictation.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 310)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }

    private func copy(_ record: InsightRecord) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(record.text, forType: .string)
        copiedID = record.id
        Task {
            try? await Task.sleep(for: .seconds(1.2))
            if copiedID == record.id {
                copiedID = nil
            }
        }
    }

    static func relativeTimestamp(
        _ timestamp: Date,
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> String {
        let elapsed = max(0, now.timeIntervalSince(timestamp))
        if elapsed < 60 {
            return "just now"
        }
        if elapsed < 3_600 {
            return "\(Int(elapsed / 60)) min ago"
        }
        if elapsed < 86_400 {
            return "\(Int(elapsed / 3_600)) hr ago"
        }
        if calendar.isDateInYesterday(timestamp) {
            return "yesterday"
        }

        let start = calendar.startOfDay(for: timestamp)
        let end = calendar.startOfDay(for: now)
        let days = max(2, calendar.dateComponents([.day], from: start, to: end).day ?? 2)
        if days <= 7 {
            return "\(days) days ago"
        }
        return timestamp.formatted(date: .abbreviated, time: .omitted)
    }
}
