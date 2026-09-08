import Foundation

/// A journal entry on a recipe. Editable (body, cooked-on, pin), never
/// versioned, soft-deleted with `deletedAt`.
///
/// Requirements: kitchen-buddy-ios 7.1–7.5
public struct RecipeNote: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<RecipeNote>

    public let id: ID
    public let recipeID: Recipe.ID
    public var body: String
    public var cookedOn: Date?
    public var pinned: Bool
    /// The recipe version that was current when the note was written.
    public let versionAtCreation: Int
    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(id: ID = ID(), recipeID: Recipe.ID, body: String, cookedOn: Date? = nil,
                pinned: Bool = false, versionAtCreation: Int, createdAt: Date, updatedAt: Date,
                deletedAt: Date? = nil) {
        self.id = id
        self.recipeID = recipeID
        self.body = body
        self.cookedOn = cookedOn
        self.pinned = pinned
        self.versionAtCreation = versionAtCreation
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }

    public var isDeleted: Bool { deletedAt != nil }
}
