import Foundation

/// One star rating (1–5) at a moment in time. Rows are append-only; the
/// current rating is the latest `ratedAt`.
///
/// Requirements: kitchen-buddy-ios 15.1–15.3
public struct Rating: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Rating>

    public static let range = 1...5

    public let id: ID
    public let recipeID: Recipe.ID
    public let value: Int
    public let ratedAt: Date

    public init(id: ID = ID(), recipeID: Recipe.ID, value: Int, ratedAt: Date) {
        self.id = id
        self.recipeID = recipeID
        self.value = value
        self.ratedAt = ratedAt
    }
}
