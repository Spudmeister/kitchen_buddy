import Foundation

/// `PT1H30M` → 90. Days and seconds are tolerated; anything else is nil.
///
/// Requirements: kitchen-buddy-ios 12.2
public enum ISO8601Duration {
    public static func minutes(_ text: String) -> Int? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard let match = trimmed.wholeMatch(of: #/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/#) else { return nil }
        let days = match.1.flatMap { Int($0) } ?? 0
        let hours = match.2.flatMap { Int($0) } ?? 0
        let minutes = match.3.flatMap { Int($0) } ?? 0
        let seconds = match.4.flatMap { Int($0) } ?? 0
        let total = days * 1440 + hours * 60 + minutes + (seconds + 30) / 60
        return (match.1 == nil && match.2 == nil && match.3 == nil && match.4 == nil) ? nil : total
    }

    public static func string(minutes: Int) -> String {
        let hours = minutes / 60, rest = minutes % 60
        switch (hours, rest) {
        case (0, _): return "PT\(rest)M"
        case (_, 0): return "PT\(hours)H"
        default: return "PT\(hours)H\(rest)M"
        }
    }
}
