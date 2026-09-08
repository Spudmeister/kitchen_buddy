import Foundation

/// One immutable snapshot of a recipe's content. Versions are numbered from
/// 1 per recipe and are never updated or deleted; a restore adds a new
/// version that records where it came from.
///
/// Requirements: kitchen-buddy-ios 2.1, 2.5
public struct RecipeVersion: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<RecipeVersion>

    public let id: ID
    public let recipeID: Recipe.ID
    public let version: Int
    public var title: String
    public var description: String?
    public var ingredients: [Ingredient]
    public var instructions: [Instruction]
    public var prepMinutes: Int?
    public var cookMinutes: Int?
    public var servings: Int?
    public var sourceURL: URL?
    /// Set when this version was created by restoring an earlier one.
    public let restoredFromVersion: Int?
    public let createdAt: Date

    public init(id: ID = ID(), recipeID: Recipe.ID, version: Int, title: String, description: String? = nil,
                ingredients: [Ingredient] = [], instructions: [Instruction] = [],
                prepMinutes: Int? = nil, cookMinutes: Int? = nil, servings: Int? = nil,
                sourceURL: URL? = nil, restoredFromVersion: Int? = nil, createdAt: Date) {
        self.id = id
        self.recipeID = recipeID
        self.version = version
        self.title = title
        self.description = description
        self.ingredients = ingredients
        self.instructions = instructions
        self.prepMinutes = prepMinutes
        self.cookMinutes = cookMinutes
        self.servings = servings
        self.sourceURL = sourceURL
        self.restoredFromVersion = restoredFromVersion
        self.createdAt = createdAt
    }

    /// The versioned fields, for comparison with a draft and for editing.
    public var content: RecipeContent {
        RecipeContent(title: title, description: description,
                      ingredients: ingredients.map(\.draft),
                      instructions: instructions.sorted { $0.step < $1.step }.map(\.draft),
                      prepMinutes: prepMinutes, cookMinutes: cookMinutes, servings: servings,
                      sourceURL: sourceURL)
    }

    public var totalMinutes: Int? { content.totalMinutes }
}
