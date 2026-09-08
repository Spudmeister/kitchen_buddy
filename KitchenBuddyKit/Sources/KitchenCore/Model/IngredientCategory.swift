/// Where an ingredient lives in a shop; carried over from the v1 format so
/// imported recipes keep it. Raw values are the storage and JSON form.
///
/// Requirements: kitchen-buddy-ios 1.1
public enum IngredientCategory: String, CaseIterable, Codable, Hashable, Sendable {
    case produce, meat, seafood, dairy, bakery, frozen, pantry, spices, beverages, other

    public var displayName: String { rawValue.capitalized }
}
