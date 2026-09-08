import Foundation

/// The recipe row: identity, pointer to the current version, placement, and
/// archive state. Content lives in `RecipeVersion`.
///
/// Requirements: kitchen-buddy-ios 1.1, 3.1, 4.2, 16.1
public struct Recipe: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Recipe>

    public let id: ID
    public var currentVersion: Int
    public var folderID: Folder.ID?
    /// Set only at creation (duplicate); never the recipe's own id; immutable.
    public let parentRecipeID: Recipe.ID?
    public var archivedAt: Date?
    public let createdAt: Date
    public var updatedAt: Date

    public init(id: ID = ID(), currentVersion: Int = 1, folderID: Folder.ID? = nil,
                parentRecipeID: Recipe.ID? = nil, archivedAt: Date? = nil,
                createdAt: Date, updatedAt: Date) {
        self.id = id
        self.currentVersion = currentVersion
        self.folderID = folderID
        self.parentRecipeID = parentRecipeID
        self.archivedAt = archivedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var isArchived: Bool { archivedAt != nil }
}
