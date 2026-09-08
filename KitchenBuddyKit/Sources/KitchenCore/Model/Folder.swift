import Foundation

/// A folder in the nested tree. Deleting is soft: the row keeps `deletedAt`
/// and its contents move to the parent.
///
/// Requirements: kitchen-buddy-ios 16.1, 16.4
public struct Folder: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Folder>

    public let id: ID
    public var name: String
    public var parentID: Folder.ID?
    public let createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(id: ID = ID(), name: String, parentID: Folder.ID? = nil,
                createdAt: Date, updatedAt: Date, deletedAt: Date? = nil) {
        self.id = id
        self.name = name
        self.parentID = parentID
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
    }
}
