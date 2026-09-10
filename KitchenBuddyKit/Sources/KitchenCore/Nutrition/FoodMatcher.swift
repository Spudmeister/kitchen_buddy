import Foundation

/// A food matched to an ingredient line and how.
public struct FoodMatch: Hashable, Sendable {
    public enum Source: Hashable, Sendable {
        /// The longest table keyword found in the ingredient name.
        case keyword(String)
        /// The user chose this food for this recipe and ingredient name.
        case override
    }

    public var food: Food
    public var source: Source

    public init(food: Food, source: Source) {
        self.food = food
        self.source = source
    }
}

/// Maps ingredient names to foods. Among the keywords that appear as whole
/// words in the normalized name, the one that ends closest to the end of
/// the name wins — English ingredient names end in the head noun, so
/// "unsweetened coconut milk" is coconut milk, not coconut — and length
/// breaks ties ("brown sugar" over "sugar"). Deterministic and pure.
///
/// Requirements: kitchen-buddy-ios 21.2
public enum FoodMatcher {
    /// Lowercased, diacritics folded, punctuation and parentheticals
    /// stripped, whitespace collapsed. Also the key food overrides use.
    public static func normalize(_ name: String) -> String {
        var text = name.folding(options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive], locale: nil)
        // Drop parenthetical notes: "chicken (boneless, skinless)".
        while let open = text.firstIndex(of: "("), let close = text[open...].firstIndex(of: ")") {
            text.removeSubrange(open...close)
        }
        let scalars = text.unicodeScalars.map { scalar -> Character in
            if CharacterSet.alphanumerics.contains(scalar) || scalar == "'" { return Character(scalar) }
            return " "
        }
        return String(scalars).split(separator: " ").joined(separator: " ")
    }

    /// Keywords longest first, so "brown sugar" beats "sugar".
    static let orderedKeywords: [(keyword: String, foodID: Food.ID)] = {
        var pairs: [(String, Food.ID)] = []
        for food in FoodTable.foods {
            for keyword in food.keywords { pairs.append((keyword, food.id)) }
        }
        return pairs.sorted { lhs, rhs in
            lhs.0.count != rhs.0.count ? lhs.0.count > rhs.0.count : lhs.0 < rhs.0
        }
    }()

    public static func match(_ name: String) -> FoodMatch? {
        let words = normalize(name).split(separator: " ").map(String.init)
        guard !words.isEmpty else { return nil }
        var best: (end: Int, length: Int, keyword: String, foodID: Food.ID)?
        for (keyword, foodID) in orderedKeywords {
            let parts = keyword.split(separator: " ").map(String.init)
            guard parts.count <= words.count, let end = lastEnd(of: parts, in: words) else { continue }
            // Longest first in `orderedKeywords`, so on an equal end the first hit stays.
            if best == nil || end > best!.end { best = (end, parts.count, keyword, foodID) }
        }
        guard let best, let food = FoodTable.food(id: best.foodID) else { return nil }
        return FoodMatch(food: food, source: .keyword(best.keyword))
    }

    /// Every food with a keyword in the name, best first (the automatic
    /// match), then foods sharing a word with the name — what the picker
    /// shows as "Close matches". Never empty when `match` isn't.
    public static func candidates(_ name: String, limit: Int = 12) -> [Food] {
        let words = normalize(name).split(separator: " ").map(String.init)
        guard !words.isEmpty else { return [] }
        var hits: [(end: Int, length: Int, order: Int, foodID: Food.ID)] = []
        for (order, (keyword, foodID)) in orderedKeywords.enumerated() {
            let parts = keyword.split(separator: " ").map(String.init)
            guard parts.count <= words.count, let end = lastEnd(of: parts, in: words) else { continue }
            hits.append((end, parts.count, order, foodID))
        }
        hits.sort { lhs, rhs in
            if lhs.end != rhs.end { return lhs.end > rhs.end }
            return lhs.order < rhs.order
        }
        var seen = Set<Food.ID>()
        var result: [Food] = []
        for hit in hits where seen.insert(hit.foodID).inserted {
            if let food = FoodTable.food(id: hit.foodID) { result.append(food) }
        }
        let meaningful = Set(words.filter { $0.count > 2 && !stopWords.contains($0) })
        if !meaningful.isEmpty {
            for food in FoodTable.foods where !seen.contains(food.id) && result.count < limit {
                let shares = food.keywords.contains { keyword in
                    keyword.split(separator: " ").contains { meaningful.contains(String($0)) }
                }
                if shares { result.append(food); seen.insert(food.id) }
            }
        }
        return Array(result.prefix(limit))
    }

    static let stopWords: Set<String> = ["and", "the", "for", "with", "fresh", "large", "small", "medium", "chopped", "diced",
                                         "minced", "sliced", "ground", "whole", "cup", "cups", "can", "cans", "optional", "divided"]

    /// Index just past the last occurrence of `parts` as a whole-word run.
    static func lastEnd(of parts: [String], in words: [String]) -> Int? {
        var start = words.count - parts.count
        while start >= 0 {
            if Array(words[start..<start + parts.count]) == parts { return start + parts.count }
            start -= 1
        }
        return nil
    }
}
