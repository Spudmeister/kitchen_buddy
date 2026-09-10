import Foundation

/// One ingredient line of the worksheet: what it matched, how many grams,
/// what it contributes, or why it was not counted.
///
/// Requirements: kitchen-buddy-ios 21.2, 21.3
public struct LineEstimate: Hashable, Sendable, Identifiable {
    public enum Status: Hashable, Sendable {
        /// Matched, weighed and added to the totals.
        case counted
        /// Pinch, dash, to taste, or no quantity: never counts either way.
        case seasoning
        /// No food in the table matches the name.
        case unmatched
        /// Matched, but the unit cannot become grams (no density or unit weight).
        case unitNotConvertible
        /// The user said "don't count" for this recipe and name.
        case excluded

        /// Lines in the coverage denominator.
        public var isCountable: Bool {
            switch self {
            case .counted, .unmatched, .unitNotConvertible: return true
            case .seasoning, .excluded: return false
            }
        }

        public var reason: String {
            switch self {
            case .counted: return "Counted"
            case .seasoning: return "Seasoning or no quantity"
            case .unmatched: return "No matching food"
            case .unitNotConvertible: return "Can't turn this measure into grams"
            case .excluded: return "Not counted (your choice)"
            }
        }
    }

    public enum GramsBasis: Hashable, Sendable {
        case weight
        case density(gramsPerMilliliter: Double)
        case unitWeight(grams: Double)

        public var description: String {
            switch self {
            case .weight: return "weight as written"
            case .density(let g): return String(format: "%.2f g/ml", g)
            case .unitWeight(let g): return "\(Int(g.rounded())) g each"
            }
        }
    }

    public var ingredient: Ingredient
    public var status: Status
    public var match: FoodMatch?
    public var grams: Double?
    public var gramsBasis: GramsBasis?
    /// This line's contribution (already scaled by grams).
    public var nutrients: Food.Nutrients?
    /// Zero for foods with no glycemic index (they carry no carbohydrate).
    public var glycemicLoad: Double?

    public var id: Ingredient.ID { ingredient.id }

    public init(ingredient: Ingredient, status: Status, match: FoodMatch? = nil, grams: Double? = nil,
                gramsBasis: GramsBasis? = nil, nutrients: Food.Nutrients? = nil, glycemicLoad: Double? = nil) {
        self.ingredient = ingredient
        self.status = status
        self.match = match
        self.grams = grams
        self.gramsBasis = gramsBasis
        self.nutrients = nutrients
        self.glycemicLoad = glycemicLoad
    }
}
