/// A stored ingredient line of one recipe version. Rows are immutable; a
/// change to any field is a new version with new rows.
///
/// Requirements: kitchen-buddy-ios 1.1, 2.1
public struct Ingredient: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Ingredient>

    public let id: ID
    public var name: String
    public var quantity: Fraction?
    public var unit: IngredientUnit?
    public var notes: String?
    public var category: IngredientCategory?

    public init(id: ID = ID(), name: String, quantity: Fraction? = nil, unit: IngredientUnit? = nil,
                notes: String? = nil, category: IngredientCategory? = nil) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.notes = notes
        self.category = category
    }

    public init(id: ID = ID(), _ draft: IngredientDraft) {
        self.init(id: id, name: draft.name, quantity: draft.quantity, unit: draft.unit,
                  notes: draft.notes, category: draft.category)
    }

    public var draft: IngredientDraft {
        IngredientDraft(name: name, quantity: quantity, unit: unit, notes: notes, category: category)
    }
}
