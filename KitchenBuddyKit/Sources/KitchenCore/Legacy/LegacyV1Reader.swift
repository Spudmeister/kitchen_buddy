import Foundation

/// Reads the PWA-era JSON shapes into drafts: the export envelope
/// (`{ version: "1.0" | "1.0.0", recipes: [...] }`), a bare array of recipes,
/// or the fixture dictionary keyed by name (`DemoRecipes.json`). Tolerant of
/// the field spellings both eras used (`prepTimeMinutes` / `prepTime.minutes`,
/// `durationMinutes` / `duration.minutes`). Quantities arrive as doubles and
/// are lifted to the nearest fraction with a denominator ≤ 64 (0.333 → 1/3).
///
/// Readers for every past format stay forever (iron rule 5). ADR-006.
///
/// Requirements: kitchen-buddy-ios 14.1
public enum LegacyV1Reader {
    public enum ReaderError: Error, Equatable {
        case notJSON
        case unrecognizedShape
    }

    public static func read(_ data: Data) throws -> [RecipeDraft] {
        guard let object = try? JSONSerialization.jsonObject(with: data) else { throw ReaderError.notJSON }
        return try drafts(from: object)
    }

    public static func drafts(from object: Any) throws -> [RecipeDraft] {
        if let array = object as? [Any] {
            return array.compactMap { $0 as? [String: Any] }.compactMap(draft(from:))
        }
        guard let dictionary = object as? [String: Any] else { throw ReaderError.unrecognizedShape }
        if let recipes = dictionary["recipes"] as? [Any] {
            return recipes.compactMap { $0 as? [String: Any] }.compactMap(draft(from:))
        }
        let keyed = dictionary.compactMap { key, value -> (String, [String: Any])? in
            guard let recipe = value as? [String: Any], recipe["title"] != nil else { return nil }
            return (key, recipe)
        }
        guard !keyed.isEmpty else { throw ReaderError.unrecognizedShape }
        return keyed.sorted { $0.0 < $1.0 }.compactMap { draft(from: $0.1) }
    }

    public static func draft(from recipe: [String: Any]) -> RecipeDraft? {
        guard let title = recipe["title"] as? String else { return nil }
        let ingredients = (recipe["ingredients"] as? [Any] ?? []).compactMap { $0 as? [String: Any] }.map { line in
            IngredientDraft(
                name: line["name"] as? String ?? "",
                quantity: quantity(line["quantity"]),
                unit: unit(line["unit"]),
                notes: line["notes"] as? String,
                category: (line["category"] as? String).flatMap(IngredientCategory.init(rawValue:))
            )
        }
        let instructions = (recipe["instructions"] as? [Any] ?? []).compactMap { $0 as? [String: Any] }.map { step in
            InstructionDraft(
                text: step["text"] as? String ?? "",
                durationMinutes: minutes(step["durationMinutes"]) ?? minutes(step["duration"]),
                notes: step["notes"] as? String
            )
        }
        let content = RecipeContent(
            title: title,
            description: recipe["description"] as? String,
            ingredients: ingredients,
            instructions: instructions,
            prepMinutes: minutes(recipe["prepTimeMinutes"]) ?? minutes(recipe["prepTime"]) ?? minutes(recipe["prepMinutes"]),
            cookMinutes: minutes(recipe["cookTimeMinutes"]) ?? minutes(recipe["cookTime"]) ?? minutes(recipe["cookMinutes"]),
            servings: integer(recipe["servings"]),
            sourceURL: (recipe["sourceUrl"] as? String ?? recipe["sourceURL"] as? String).flatMap(URL.init(string:))
        )
        let tags = (recipe["tags"] as? [Any] ?? []).compactMap { $0 as? String }
        return RecipeDraft(content: content, tags: tags)
    }

    static func integer(_ value: Any?) -> Int? {
        switch value {
        case let number as NSNumber: return number.intValue
        case let text as String: return Int(text.trimmingCharacters(in: .whitespaces))
        default: return nil
        }
    }

    /// Minutes from a number or a `{ minutes: n }` object.
    static func minutes(_ value: Any?) -> Int? {
        if let object = value as? [String: Any] { return integer(object["minutes"]) }
        return integer(value)
    }

    static func quantity(_ value: Any?) -> Fraction? {
        switch value {
        case let number as NSNumber: return Fraction(approximating: number.doubleValue, maxDenominator: 64)
        case let text as String: return QuantityParser.parse(text)
        default: return nil
        }
    }

    static let unitAliases: [String: IngredientUnit] = [
        "teaspoon": .tsp, "teaspoons": .tsp, "tablespoon": .tbsp, "tablespoons": .tbsp,
        "cups": .cup, "fl oz": .fluidOunce, "fluid ounce": .fluidOunce, "fluid ounces": .fluidOunce,
        "pints": .pint, "quarts": .quart, "gallons": .gallon,
        "milliliter": .ml, "milliliters": .ml, "millilitre": .ml, "millilitres": .ml,
        "liter": .l, "liters": .l, "litre": .l, "litres": .l,
        "ounce": .oz, "ounces": .oz, "pound": .lb, "pounds": .lb, "lbs": .lb,
        "gram": .g, "grams": .g, "kilogram": .kg, "kilograms": .kg,
        "pieces": .piece, "pinches": .pinch, "dashes": .dash, "to taste": .toTaste,
    ]

    static func unit(_ value: Any?) -> IngredientUnit? {
        guard let text = (value as? String)?.trimmingCharacters(in: .whitespaces).lowercased(), !text.isEmpty else {
            return nil
        }
        return IngredientUnit(rawValue: text) ?? unitAliases[text]
    }
}
