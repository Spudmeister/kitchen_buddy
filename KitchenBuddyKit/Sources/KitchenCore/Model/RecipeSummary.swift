import Foundation

/// A Library row: what the search projection holds for one recipe.
///
/// Requirements: kitchen-buddy-ios 6.4
public struct RecipeSummary: Identifiable, Hashable, Codable, Sendable {
    public let id: Recipe.ID
    public var title: String
    public var description: String?
    public var folderID: Folder.ID?
    public var archivedAt: Date?
    public var latestRating: Int?
    public var totalMinutes: Int?
    public var thumbnailPhotoID: Photo.ID?
    public var tags: [String]
    public var createdAt: Date
    public var updatedAt: Date

    public init(id: Recipe.ID, title: String, description: String? = nil, folderID: Folder.ID? = nil,
                archivedAt: Date? = nil, latestRating: Int? = nil, totalMinutes: Int? = nil,
                thumbnailPhotoID: Photo.ID? = nil, tags: [String] = [], createdAt: Date, updatedAt: Date) {
        self.id = id
        self.title = title
        self.description = description
        self.folderID = folderID
        self.archivedAt = archivedAt
        self.latestRating = latestRating
        self.totalMinutes = totalMinutes
        self.thumbnailPhotoID = thumbnailPhotoID
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var isArchived: Bool { archivedAt != nil }
}
