import Foundation

/// A photo attached to a recipe. Files live under `Photos/`; the row is
/// never deleted, removal sets `removedAt`.
///
/// Requirements: kitchen-buddy-ios 11.2, 11.3, 11.4
public struct Photo: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Photo>

    public let id: ID
    public let recipeID: Recipe.ID
    public let fileName: String
    public let width: Int
    public let height: Int
    public let takenAt: Date?
    public var caption: String?
    public var sortOrder: Int
    public let createdAt: Date
    public var removedAt: Date?

    public init(id: ID = ID(), recipeID: Recipe.ID, fileName: String, width: Int, height: Int,
                takenAt: Date? = nil, caption: String? = nil, sortOrder: Int,
                createdAt: Date, removedAt: Date? = nil) {
        self.id = id
        self.recipeID = recipeID
        self.fileName = fileName
        self.width = width
        self.height = height
        self.takenAt = takenAt
        self.caption = caption
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.removedAt = removedAt
    }
}
