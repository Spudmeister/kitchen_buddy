import Foundation

/// Everything that is versioned: the fields whose change on save creates a
/// new `RecipeVersion`. Tags, folder, photos, ratings, and notes are not
/// content and never version (Requirement 2.2).
///
/// Requirements: kitchen-buddy-ios 1.1, 2.1, 2.2
public struct RecipeContent: Hashable, Codable, Sendable {
    public var title: String
    public var description: String?
    public var ingredients: [IngredientDraft]
    public var instructions: [InstructionDraft]
    public var prepMinutes: Int?
    public var cookMinutes: Int?
    public var servings: Int?
    public var sourceURL: URL?

    public init(title: String, description: String? = nil,
                ingredients: [IngredientDraft] = [], instructions: [InstructionDraft] = [],
                prepMinutes: Int? = nil, cookMinutes: Int? = nil, servings: Int? = nil,
                sourceURL: URL? = nil) {
        self.title = title
        self.description = description
        self.ingredients = ingredients
        self.instructions = instructions
        self.prepMinutes = prepMinutes
        self.cookMinutes = cookMinutes
        self.servings = servings
        self.sourceURL = sourceURL
    }

    /// Prep + cook when either is set.
    public var totalMinutes: Int? {
        if prepMinutes == nil && cookMinutes == nil { return nil }
        return (prepMinutes ?? 0) + (cookMinutes ?? 0)
    }

    /// The canonical form that is stored and compared: trimmed text, empty
    /// optionals collapsed to nil, unnamed ingredients and empty steps
    /// dropped, non-positive numbers dropped. Two drafts whose normalized
    /// content is equal do not produce a new version.
    public func normalized() -> RecipeContent {
        RecipeContent(
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.flatMap(Text.trimmedOrNil),
            ingredients: ingredients.map { $0.normalized() }.filter { !$0.name.isEmpty },
            instructions: instructions.map { $0.normalized() }.filter { !$0.text.isEmpty },
            prepMinutes: prepMinutes.flatMap { $0 >= 0 ? $0 : nil },
            cookMinutes: cookMinutes.flatMap { $0 >= 0 ? $0 : nil },
            servings: servings.flatMap { $0 > 0 ? $0 : nil },
            sourceURL: sourceURL
        )
    }
}
