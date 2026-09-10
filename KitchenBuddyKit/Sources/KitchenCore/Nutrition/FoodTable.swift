import Foundation

/// The bundled food table, loaded once from `Resources/foods.json`
/// (written by `scripts/foods-table.py`). `version` is part of the health
/// index version: bumping it reruns every recipe's estimate at next open.
///
/// Requirements: kitchen-buddy-ios 21.1, 21.7
public enum FoodTable {
    public struct Document: Codable, Sendable {
        public var version: Int
        public var nutrientSource: String
        public var glycemicIndexSource: String
        public var foods: [Food]
    }

    /// The JSON row shape, kept terse for hand editing.
    struct Row: Codable {
        var id: String
        var name: String
        var keywords: [String]
        var usda: String?
        var carbs: Double
        var fiber: Double
        var sodium: Double
        var satFat: Double
        var gi: Int?
        var giBasis: String
        var unitGrams: Double?
        var cupGrams: Double?

        var food: Food {
            Food(id: id, name: name, keywords: keywords, usdaDescription: usda,
                 per100g: Food.Nutrients(carbohydrate: carbs, fiber: fiber, sodium: sodium, saturatedFat: satFat),
                 glycemicIndex: gi.map { Food.GlycemicIndex(value: $0, basis: giBasis) },
                 glycemicIndexNote: gi == nil ? giBasis : nil,
                 unitGrams: unitGrams, cupGrams: cupGrams)
        }
    }

    struct RawDocument: Codable {
        var version: Int
        var nutrientSource: String
        var glycemicIndexSource: String
        var foods: [Row]
    }

    public static let document: Document = load()
    public static var version: Int { document.version }
    public static var foods: [Food] { document.foods }
    public static var nutrientSource: String { document.nutrientSource }
    public static var glycemicIndexSource: String { document.glycemicIndexSource }

    static let byID: [Food.ID: Food] = Dictionary(uniqueKeysWithValues: foods.map { ($0.id, $0) })

    public static func food(id: Food.ID) -> Food? { byID[id] }

    /// Foods whose name or a keyword contains the text, for the picker.
    public static func search(_ text: String) -> [Food] {
        let needle = FoodMatcher.normalize(text)
        guard !needle.isEmpty else { return foods.sorted { $0.name < $1.name } }
        return foods.filter { food in
            FoodMatcher.normalize(food.name).contains(needle) || food.keywords.contains { $0.contains(needle) }
        }.sorted { $0.name < $1.name }
    }

    /// Decodes a table from JSON data; exposed so tests can validate the
    /// bundled file and fixtures.
    public static func decode(_ data: Data) throws -> Document {
        let raw = try JSONDecoder().decode(RawDocument.self, from: data)
        return Document(version: raw.version, nutrientSource: raw.nutrientSource,
                        glycemicIndexSource: raw.glycemicIndexSource, foods: raw.foods.map(\.food))
    }

    private static func load() -> Document {
        // `.process` flattens the folder (a top-level "Resources" directory
        // breaks codesign on iOS); older builds kept the subdirectory.
        guard let url = Bundle.module.url(forResource: "foods", withExtension: "json")
                ?? Bundle.module.url(forResource: "foods", withExtension: "json", subdirectory: "Resources"),
              let data = try? Data(contentsOf: url),
              let document = try? decode(data) else {
            assertionFailure("foods.json missing or malformed — run scripts/foods-table.py")
            return Document(version: 0, nutrientSource: "", glycemicIndexSource: "", foods: [])
        }
        return document
    }
}
