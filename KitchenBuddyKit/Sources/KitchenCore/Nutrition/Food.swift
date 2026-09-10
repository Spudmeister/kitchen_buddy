import Foundation

/// One row of the bundled food table: nutrients per 100 g from USDA
/// FoodData Central, a glycemic index with its basis, and the weights that
/// turn a recipe's quantities into grams (ADR-009).
///
/// Requirements: kitchen-buddy-ios 21.1
public struct Food: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = String

    /// Nutrients per 100 g (or, after scaling, per line / recipe / serving).
    public struct Nutrients: Hashable, Codable, Sendable {
        /// Total carbohydrate, grams.
        public var carbohydrate: Double
        /// Dietary fibre, grams.
        public var fiber: Double
        /// Sodium, milligrams.
        public var sodium: Double
        /// Saturated fat, grams.
        public var saturatedFat: Double

        public init(carbohydrate: Double, fiber: Double, sodium: Double, saturatedFat: Double) {
            self.carbohydrate = carbohydrate
            self.fiber = fiber
            self.sodium = sodium
            self.saturatedFat = saturatedFat
        }

        public static let zero = Nutrients(carbohydrate: 0, fiber: 0, sodium: 0, saturatedFat: 0)

        /// Carbohydrate that raises blood glucose: total minus fibre.
        public var availableCarbohydrate: Double { max(0, carbohydrate - fiber) }

        public func scaled(by factor: Double) -> Nutrients {
            Nutrients(carbohydrate: carbohydrate * factor, fiber: fiber * factor,
                      sodium: sodium * factor, saturatedFat: saturatedFat * factor)
        }

        public static func + (lhs: Nutrients, rhs: Nutrients) -> Nutrients {
            Nutrients(carbohydrate: lhs.carbohydrate + rhs.carbohydrate, fiber: lhs.fiber + rhs.fiber,
                      sodium: lhs.sodium + rhs.sodium, saturatedFat: lhs.saturatedFat + rhs.saturatedFat)
        }
    }

    public struct GlycemicIndex: Hashable, Codable, Sendable {
        public var value: Int
        /// "measured: …", "proxy: …" or "assumed: …" — shown on the worksheet.
        public var basis: String

        public init(value: Int, basis: String) {
            self.value = value
            self.basis = basis
        }
    }

    public let id: ID
    public var name: String
    /// Lowercase phrases matched against ingredient names; longest wins.
    public var keywords: [String]
    /// The USDA description the nutrients came from.
    public var usdaDescription: String?
    public var per100g: Nutrients
    /// Missing means the food has too little carbohydrate to matter, or the
    /// tables have nothing usable; `glycemicIndexNote` says which.
    public var glycemicIndex: GlycemicIndex?
    public var glycemicIndexNote: String?
    /// Grams of one piece (an egg, a clove, a can) for count quantities.
    public var unitGrams: Double?
    /// Grams per US cup for volume quantities.
    public var cupGrams: Double?

    public init(id: ID, name: String, keywords: [String], usdaDescription: String? = nil, per100g: Nutrients,
                glycemicIndex: GlycemicIndex? = nil, glycemicIndexNote: String? = nil,
                unitGrams: Double? = nil, cupGrams: Double? = nil) {
        self.id = id
        self.name = name
        self.keywords = keywords
        self.usdaDescription = usdaDescription
        self.per100g = per100g
        self.glycemicIndex = glycemicIndex
        self.glycemicIndexNote = glycemicIndexNote
        self.unitGrams = unitGrams
        self.cupGrams = cupGrams
    }

    /// Grams per millilitre, when the food can be measured by volume.
    public var gramsPerMilliliter: Double? { cupGrams.map { $0 / IngredientDensity.usCupMilliliters } }
}
