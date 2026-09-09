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

/// Maps ingredient names to foods: the longest keyword that appears as
/// whole words in the normalized name wins, the same rule
/// `IngredientDensity` uses. Deterministic and pure.
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
        let padded = " " + normalize(name) + " "
        guard padded.count > 2 else { return nil }
        for (keyword, foodID) in orderedKeywords where padded.contains(" " + keyword + " ") {
            guard let food = FoodTable.food(id: foodID) else { continue }
            return FoodMatch(food: food, source: .keyword(keyword))
        }
        return nil
    }
}
