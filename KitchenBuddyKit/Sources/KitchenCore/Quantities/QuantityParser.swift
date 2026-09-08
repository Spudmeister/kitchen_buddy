import Foundation

/// Turns what a cook types into an exact rational: "1 1/2", "1½", "¾",
/// "3/4", "0.75", "2". Whitespace-tolerant; a hyphen may join a mixed
/// number ("1-1/2"). Returns nil for anything else, including negatives,
/// ranges, and a zero denominator.
///
/// Requirements: kitchen-buddy-ios 1.3
public enum QuantityParser {
    static let vulgarFractions: [Character: Fraction] = [
        "¼": Fraction(1, 4), "½": Fraction(1, 2), "¾": Fraction(3, 4),
        "⅓": Fraction(1, 3), "⅔": Fraction(2, 3),
        "⅛": Fraction(1, 8), "⅜": Fraction(3, 8), "⅝": Fraction(5, 8), "⅞": Fraction(7, 8),
        "⅕": Fraction(1, 5), "⅖": Fraction(2, 5), "⅗": Fraction(3, 5), "⅘": Fraction(4, 5),
        "⅙": Fraction(1, 6), "⅚": Fraction(5, 6),
    ]

    public static func parse(_ input: String) -> Fraction? {
        var text = input.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "⁄", with: "/")
        guard !text.isEmpty else { return nil }

        // "1½", "1 ½", "½"
        if let last = text.last, let vulgar = vulgarFractions[last] {
            text.removeLast()
            let wholeText = text.trimmingCharacters(in: .whitespaces)
                .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
            if wholeText.isEmpty { return vulgar }
            guard let whole = Int(wholeText), whole >= 0 else { return nil }
            return Fraction(whole) + vulgar
        }

        // "1 1/2", "1-1/2", "3/4"
        if let match = text.wholeMatch(of: #/^(?:(\d+)[\s\-]+)?(\d+)\s*/\s*(\d+)$/#) {
            guard let numerator = Int(match.2), let denominator = Int(match.3), denominator > 0 else { return nil }
            let whole = match.1.flatMap { Int($0) } ?? 0
            return Fraction(whole) + Fraction(numerator, denominator)
        }

        // "0.75", ".5", "1,5"
        if let match = text.wholeMatch(of: #/^(\d*)[.,](\d{1,9})$/#) {
            let whole = match.1.isEmpty ? 0 : (Int(match.1) ?? 0)
            let digits = String(match.2)
            guard let numerator = Int(digits) else { return nil }
            var denominator = 1
            for _ in 0..<digits.count { denominator *= 10 }
            return Fraction(whole) + Fraction(numerator, denominator)
        }

        // "2"
        if let whole = Int(text), whole >= 0, text.allSatisfy(\.isNumber) { return Fraction(whole) }
        return nil
    }
}
