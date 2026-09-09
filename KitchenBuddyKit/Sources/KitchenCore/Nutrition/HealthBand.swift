import Foundation

/// Where a per-serving figure falls for a profile. Each band has a word and
/// a symbol as well as a colour (Requirement 19.2).
///
/// Requirements: kitchen-buddy-ios 21.5
public enum HealthBand: Int, Codable, Hashable, Sendable, CaseIterable {
    case low = 0
    case medium = 1
    case high = 2
    case unknown = 3

    public var word: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .unknown: return "Unknown"
        }
    }

    /// The friendliness word shown on badges.
    public var friendliness: String {
        switch self {
        case .low: return "Friendly"
        case .medium: return "Moderate"
        case .high: return "Heavy"
        case .unknown: return "Not enough data"
        }
    }

    public var symbolName: String {
        switch self {
        case .low: return "checkmark.circle.fill"
        case .medium: return "minus.circle.fill"
        case .high: return "exclamationmark.triangle.fill"
        case .unknown: return "questionmark.circle"
        }
    }

    /// Colour name the UI maps to a `Color`: green / orange / red / gray.
    public var colorName: String {
        switch self {
        case .low: return "green"
        case .medium: return "orange"
        case .high: return "red"
        case .unknown: return "gray"
        }
    }

    /// Stored in `recipe_health`; unknown is NULL.
    public var storageValue: Int? { self == .unknown ? nil : rawValue }

    public init(storageValue: Int?) {
        self = storageValue.flatMap(HealthBand.init(rawValue:)) ?? .unknown
    }
}
