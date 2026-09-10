import Foundation

/// The user's correction of a worksheet line: for this recipe, an
/// ingredient whose normalized name is `ingredientKey` is `foodID`, or is
/// not counted at all when nil. Append-only; the latest per key wins, and it
/// survives versions because it keys on the name, not the row.
///
/// Requirements: kitchen-buddy-ios 21.6, 21.10
public struct FoodOverride: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<FoodOverride>

    public let id: ID
    public let recipeID: Recipe.ID
    /// `FoodMatcher.normalize(ingredient.name)`.
    public var ingredientKey: String
    public var foodID: Food.ID?
    public let createdAt: Date

    public init(id: ID = ID(), recipeID: Recipe.ID, ingredientKey: String, foodID: Food.ID?, createdAt: Date) {
        self.id = id
        self.recipeID = recipeID
        self.ingredientKey = ingredientKey
        self.foodID = foodID
        self.createdAt = createdAt
    }

    /// A food id that means "back to automatic matching": the row exists
    /// (append-only history) but `effective` drops the key.
    public static let automaticMarker = ""

    public var isAutomaticMarker: Bool { foodID == Self.automaticMarker }

    /// Latest-wins map for the estimator: key → food id, or nil for "don't
    /// count"; keys whose latest row is the automatic marker are absent.
    public static func effective(_ overrides: [FoodOverride]) -> [String: Food.ID?] {
        var map: [String: Food.ID?] = [:]
        for override in overrides.sorted(by: { ($0.createdAt, $0.id.rawValue) < ($1.createdAt, $1.id.rawValue) }) {
            if override.isAutomaticMarker {
                map.removeValue(forKey: override.ingredientKey)
            } else {
                map[override.ingredientKey] = override.foodID
            }
        }
        return map
    }
}
