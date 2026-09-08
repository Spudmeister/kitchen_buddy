import Foundation

/// Timestamps are stored as ISO-8601 UTC text with millisecond precision
/// ("2026-09-08T14:03:07.250Z"): readable in any SQLite browser, sorts
/// lexicographically, and round-trips exactly once normalized.
///
/// Requirements: kitchen-buddy-ios 1.6, 17.8
public enum Timestamp {
    private static let formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()

    public static func string(_ date: Date) -> String { formatter.string(from: date) }

    public static func date(_ text: String) -> Date? { formatter.date(from: text) }

    /// The date as it will read back from storage. Stores apply this to every
    /// date they write so that what they return equals what a later fetch
    /// returns.
    public static func normalize(_ date: Date) -> Date {
        formatter.date(from: formatter.string(from: date)) ?? date
    }
}
