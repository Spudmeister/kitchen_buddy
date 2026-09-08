import Foundation

/// What the editor and importers hand to the store: versioned content plus
/// the non-versioned placement (tags, folder). Validation mirrors the
/// editor's Save rules and names the failing rule.
///
/// Requirements: kitchen-buddy-ios 1.1, 1.4, 5.1, 16.1
public struct RecipeDraft: Hashable, Codable, Sendable {
    public var content: RecipeContent
    public var tags: [String]
    public var folderID: Folder.ID?

    public init(content: RecipeContent, tags: [String] = [], folderID: Folder.ID? = nil) {
        self.content = content
        self.tags = tags
        self.folderID = folderID
    }

    public init(title: String, description: String? = nil,
                ingredients: [IngredientDraft] = [], instructions: [InstructionDraft] = [],
                prepMinutes: Int? = nil, cookMinutes: Int? = nil, servings: Int? = nil,
                sourceURL: URL? = nil, tags: [String] = [], folderID: Folder.ID? = nil) {
        self.init(content: RecipeContent(title: title, description: description,
                                         ingredients: ingredients, instructions: instructions,
                                         prepMinutes: prepMinutes, cookMinutes: cookMinutes,
                                         servings: servings, sourceURL: sourceURL),
                  tags: tags, folderID: folderID)
    }

    /// Editor for an existing recipe starts from its current version.
    public init(version: RecipeVersion, tags: [String], folderID: Folder.ID?) {
        self.init(content: version.content, tags: tags, folderID: folderID)
    }

    public enum ValidationError: Error, Hashable, Sendable, CustomStringConvertible {
        case emptyTitle
        case noNamedIngredient
        case noStep

        public var description: String {
            switch self {
            case .emptyTitle: return "Add a title."
            case .noNamedIngredient: return "Add at least one ingredient with a name."
            case .noStep: return "Add at least one step."
            }
        }
    }

    /// Every rule the draft breaks; empty means it can be saved.
    public var validationErrors: [ValidationError] {
        let normalized = content.normalized()
        var errors: [ValidationError] = []
        if normalized.title.isEmpty { errors.append(.emptyTitle) }
        if normalized.ingredients.isEmpty { errors.append(.noNamedIngredient) }
        if normalized.instructions.isEmpty { errors.append(.noStep) }
        return errors
    }

    public var isValid: Bool { validationErrors.isEmpty }

    /// Normalized content and tags (trimmed, de-duplicated case-insensitively,
    /// first spelling kept, original order).
    public func normalized() -> RecipeDraft {
        RecipeDraft(content: content.normalized(), tags: TagName.normalize(tags), folderID: folderID)
    }
}
