import Foundation

/// Tag names are free text, trimmed, compared case-insensitively.
///
/// Requirements: kitchen-buddy-ios 5.1
public enum TagName {
    /// Trimmed, whitespace collapsed to single spaces, newlines removed;
    /// nil when nothing is left.
    public static func normalize(_ name: String) -> String? {
        let parts = name.split(whereSeparator: { $0.isWhitespace || $0.isNewline })
        let joined = parts.joined(separator: " ")
        return joined.isEmpty ? nil : joined
    }

    /// Normalizes each name and drops case-insensitive duplicates, keeping
    /// the first spelling and the original order.
    public static func normalize(_ names: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []
        for raw in names {
            guard let name = normalize(raw) else { continue }
            let key = Text.sortKey(name)
            if seen.insert(key).inserted { result.append(name) }
        }
        return result
    }

    /// The case-folded comparison key.
    public static func key(_ name: String) -> String { Text.sortKey(name) }
}
