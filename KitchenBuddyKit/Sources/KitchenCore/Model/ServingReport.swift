import Foundation

/// "This recipe really makes N servings for us." Append-only; the latest
/// report is the recipe's effective servings. `servings == nil` means
/// "back to the recipe's own count".
///
/// Requirements: kitchen-buddy-ios 20.1, 20.2, 20.4
public struct ServingReport: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<ServingReport>

    public let id: ID
    public let recipeID: Recipe.ID
    public var servings: Int?
    public var note: String?
    public let reportedAt: Date

    public init(id: ID = ID(), recipeID: Recipe.ID, servings: Int?, note: String? = nil, reportedAt: Date) {
        self.id = id
        self.recipeID = recipeID
        self.servings = servings
        self.note = note
        self.reportedAt = reportedAt
    }
}
