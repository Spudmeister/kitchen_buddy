import Foundation

/// One entry of a recipe's rating history: a star rating or a clear.
/// Both are append-only events; the newest decides the current rating.
///
/// Requirements: kitchen-buddy-ios 15.2, 15.3
public enum RatingEvent: Hashable, Codable, Sendable, Identifiable {
    case rated(Rating)
    case cleared(id: Tagged<RatingEvent>, recipeID: Recipe.ID, at: Date)

    public var id: String {
        switch self {
        case .rated(let rating): return rating.id.rawValue
        case .cleared(let id, _, _): return id.rawValue
        }
    }

    public var date: Date {
        switch self {
        case .rated(let rating): return rating.ratedAt
        case .cleared(_, _, let date): return date
        }
    }

    /// The star value, or nil for a clear.
    public var value: Int? {
        if case .rated(let rating) = self { return rating.value }
        return nil
    }
}
