import Foundation

/// Turns an ingredient line as websites and people write it into a draft:
/// "2 1/2 cups all-purpose flour, sifted" → 5/2 cup "all-purpose flour",
/// notes "sifted". Also formats a draft back to a line; `parse(format(x))`
/// returns `x` for normalized drafts (property P31).
///
/// Requirements: kitchen-buddy-ios 1.3, 12.2
public enum IngredientNormalizer {
    public static let unitAliases: [String: IngredientUnit] = [
        "tsp": .tsp, "tsps": .tsp, "teaspoon": .tsp, "teaspoons": .tsp, "t": .tsp,
        "tbsp": .tbsp, "tbsps": .tbsp, "tbs": .tbsp, "tablespoon": .tbsp, "tablespoons": .tbsp,
        "cup": .cup, "cups": .cup, "c": .cup,
        "fl oz": .fluidOunce, "fl. oz.": .fluidOunce, "fluid ounce": .fluidOunce, "fluid ounces": .fluidOunce,
        "pint": .pint, "pints": .pint, "pt": .pint,
        "quart": .quart, "quarts": .quart, "qt": .quart,
        "gallon": .gallon, "gallons": .gallon, "gal": .gallon,
        "ml": .ml, "milliliter": .ml, "milliliters": .ml, "millilitre": .ml, "millilitres": .ml,
        "l": .l, "liter": .l, "liters": .l, "litre": .l, "litres": .l,
        "oz": .oz, "ounce": .oz, "ounces": .oz,
        "lb": .lb, "lbs": .lb, "pound": .lb, "pounds": .lb,
        "g": .g, "gram": .g, "grams": .g,
        "kg": .kg, "kilogram": .kg, "kilograms": .kg,
        "piece": .piece, "pieces": .piece, "pc": .piece, "pcs": .piece,
        "dozen": .dozen,
        "pinch": .pinch, "pinches": .pinch,
        "dash": .dash, "dashes": .dash,
        "to taste": .toTaste,
    ]

    static let categoryKeywords: [(IngredientCategory, [String])] = [
        (.spices, ["salt", "pepper", "cumin", "paprika", "cinnamon", "nutmeg", "oregano", "thyme", "basil", "rosemary", "chili powder", "curry", "turmeric", "coriander", "cayenne", "spice", "seasoning", "clove", "bay leaf", "vanilla extract"]),
        (.dairy, ["milk", "butter", "cheese", "cream", "yogurt", "yoghurt", "egg", "parmesan", "mozzarella", "cheddar", "feta", "ricotta", "ghee"]),
        (.meat, ["chicken", "beef", "pork", "lamb", "bacon", "sausage", "turkey", "ham", "steak", "ground meat", "mince"]),
        (.seafood, ["shrimp", "prawn", "salmon", "tuna", "cod", "fish", "crab", "lobster", "anchov", "clam", "mussel", "scallop"]),
        (.bakery, ["bread", "baguette", "bun", "tortilla", "pita", "croissant", "roll"]),
        (.frozen, ["frozen"]),
        (.beverages, ["wine", "beer", "juice", "stock", "broth", "coffee", "tea", "water"]),
        (.produce, ["onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper", "lettuce", "spinach", "kale", "lemon", "lime", "apple", "banana", "berry", "berries", "avocado", "cucumber", "zucchini", "mushroom", "herb", "parsley", "cilantro", "ginger", "chile", "chilli", "scallion", "leek", "squash", "corn", "peas", "beans", "orange", "mango", "pear", "peach", "grape", "cabbage", "broccoli", "cauliflower"]),
        (.pantry, ["flour", "sugar", "oil", "vinegar", "rice", "pasta", "noodle", "oat", "honey", "syrup", "soy sauce", "baking", "yeast", "chocolate", "cocoa", "nut", "almond", "walnut", "peanut", "seed", "lentil", "chickpea", "can", "tomato paste", "breadcrumb", "cornstarch", "salt"]),
    ]

    /// Sorted longest-first so "fl oz" wins over "oz".
    static let sortedAliases: [(String, IngredientUnit)] = unitAliases.sorted { $0.key.count > $1.key.count }

    public static func parse(_ line: String) -> IngredientDraft {
        var text = HTMLText.line(line)
        text = text.replacingOccurrences(of: "⁄", with: "/")
        // Split off notes: ", finely chopped" or "(about 3 cups)".
        var notes: [String] = []
        while let open = text.firstIndex(of: "("), let close = text[open...].firstIndex(of: ")") {
            let inner = String(text[text.index(after: open)..<close]).trimmingCharacters(in: .whitespaces)
            if !inner.isEmpty { notes.append(inner) }
            text.removeSubrange(open...close)
        }
        text = text.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        if let comma = text.firstIndex(of: ",") {
            let tail = String(text[text.index(after: comma)...]).trimmingCharacters(in: .whitespaces)
            if !tail.isEmpty { notes.insert(tail, at: 0) }
            text = String(text[..<comma]).trimmingCharacters(in: .whitespaces)
        }

        // Quantity: leading number, fraction, mixed number, or range ("1-2", "1 to 2" → first).
        var quantity: Fraction?
        let quantityPattern = #/^((?:\d+\s+)?\d+/\d+|\d+(?:[.,]\d+)?(?:\s*[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*(?:-|–|to)\s*(?:\d+\s+)?\d+(?:/\d+|[.,]\d+)?)?\s*/#
        if let match = text.prefixMatch(of: quantityPattern) {
            quantity = QuantityParser.parse(String(match.1))
            if quantity != nil { text = String(text[match.range.upperBound...]).trimmingCharacters(in: .whitespaces) }
        }

        // Unit: longest alias that starts the rest, followed by a boundary.
        var unit: IngredientUnit?
        if quantity != nil {
            let lowered = text.lowercased()
            for (alias, candidate) in sortedAliases {
                if lowered == alias || lowered.hasPrefix(alias + " ") || lowered.hasPrefix(alias + ".") {
                    unit = candidate
                    var rest = String(text.dropFirst(alias.count))
                    if rest.hasPrefix(".") { rest.removeFirst() }
                    text = rest.trimmingCharacters(in: .whitespaces)
                    break
                }
            }
            if text.lowercased().hasPrefix("of ") { text = String(text.dropFirst(3)) }
        }

        let name = text.trimmingCharacters(in: .whitespaces)
        return IngredientDraft(name: name.isEmpty ? line.trimmingCharacters(in: .whitespaces) : name,
                               quantity: quantity, unit: unit,
                               notes: notes.isEmpty ? nil : notes.joined(separator: ", "),
                               category: category(for: name))
    }

    /// The category of the longest keyword found in the name, so "chickpea"
    /// (pantry) beats "pea" (produce).
    public static func category(for name: String) -> IngredientCategory? {
        let lowered = name.lowercased()
        var best: (IngredientCategory, Int)?
        for (category, keywords) in categoryKeywords {
            for keyword in keywords where lowered.contains(keyword) {
                if best == nil || keyword.count > best!.1 { best = (category, keyword.count) }
            }
        }
        return best?.0
    }

    /// The canonical line: "2½ cups flour, sifted". `parse` reads it back.
    public static func format(_ draft: IngredientDraft) -> String {
        var parts: [String] = []
        if let quantity = draft.quantity { parts.append(QuantityFormatter.string(for: quantity)) }
        if let unit = draft.unit, draft.quantity != nil { parts.append(unit.rawValue.replacingOccurrences(of: "_", with: " ")) }
        parts.append(draft.name)
        var line = parts.joined(separator: " ")
        if let notes = draft.notes { line += ", \(notes)" }
        return line
    }

    /// Splits pasted text into lines, dropping blanks and bullets.
    public static func lines(fromPasted text: String) -> [String] {
        text.components(separatedBy: .newlines)
            .map { $0.replacingOccurrences(of: #"^\s*[-•*·\d]+[.)]?\s+"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}
