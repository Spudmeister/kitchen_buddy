/// One ingredient line as entered or imported: no identity, no position.
/// Becomes an `Ingredient` row when a version is written.
///
/// Requirements: kitchen-buddy-ios 1.1, 1.3
public struct IngredientDraft: Hashable, Codable, Sendable {
    public var name: String
    public var quantity: Fraction?
    public var unit: IngredientUnit?
    public var notes: String?
    public var category: IngredientCategory?

    public init(name: String, quantity: Fraction? = nil, unit: IngredientUnit? = nil,
                notes: String? = nil, category: IngredientCategory? = nil) {
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.notes = notes
        self.category = category
    }

    /// Trimmed name and notes; empty notes become nil. Name-less drafts are
    /// dropped by `RecipeContent.normalized()`.
    public func normalized() -> IngredientDraft {
        var copy = self
        copy.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        copy.notes = notes.flatMap(Text.trimmedOrNil)
        return copy
    }
}
