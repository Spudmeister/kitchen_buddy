import Foundation

/// A type-safe identifier: a UUID string that can only be compared with
/// identifiers of the same entity, so a `Tagged<Folder>` never lands in a
/// `Tagged<Recipe>` parameter. Encodes as a bare JSON string.
///
/// Requirements: kitchen-buddy-ios 1.1
public struct Tagged<Entity>: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
    public let rawValue: String

    public init(rawValue: String) { self.rawValue = rawValue }
    public init(_ rawValue: String) { self.rawValue = rawValue }

    /// A fresh random identifier.
    public init() { rawValue = UUID().uuidString.lowercased() }

    public var description: String { rawValue }
}

extension Tagged: Codable {
    public init(from decoder: Decoder) throws {
        rawValue = try decoder.singleValueContainer().decode(String.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

extension Tagged: Comparable {
    public static func < (lhs: Tagged, rhs: Tagged) -> Bool { lhs.rawValue < rhs.rawValue }
}
