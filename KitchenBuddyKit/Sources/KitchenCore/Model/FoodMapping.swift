import Foundation

/// A book-wide correction of the food table's matching: every ingredient
/// whose normalized name is `ingredientKey` is `foodID` (nil = don't
/// count), in every recipe. Append-only; the latest per key wins; the
/// automatic marker clears it. A recipe-level `FoodOverride` still takes
/// precedence for that one recipe.
///
/// Requirements: kitchen-buddy-ios 21.6, 21.11
public struct FoodMapping: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<FoodMapping>

    public let id: ID
    public var ingredientKey: String
    public var foodID: Food.ID?
    public let createdAt: Date

    public init(id: ID = ID(), ingredientKey: String, foodID: Food.ID?, createdAt: Date) {
        self.id = id
        self.ingredientKey = ingredientKey
        self.foodID = foodID
        self.createdAt = createdAt
    }

    public var isAutomaticMarker: Bool { foodID == FoodOverride.automaticMarker }

    /// Latest-wins map, automatic markers removing the key.
    public static func effective(_ mappings: [FoodMapping]) -> [String: Food.ID?] {
        var map: [String: Food.ID?] = [:]
        for mapping in mappings.sorted(by: { ($0.createdAt, $0.id.rawValue) < ($1.createdAt, $1.id.rawValue) }) {
            if mapping.isAutomaticMarker {
                map.removeValue(forKey: mapping.ingredientKey)
            } else {
                map[mapping.ingredientKey] = mapping.foodID
            }
        }
        return map
    }

    /// Recipe overrides layered over book-wide mappings.
    public static func merge(mappings: [String: Food.ID?], overrides: [String: Food.ID?]) -> [String: Food.ID?] {
        var merged = mappings
        for (key, value) in overrides { merged[key] = value }
        return merged
    }
}
