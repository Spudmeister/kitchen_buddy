/// A tag row. Names are unique case-insensitively; the first spelling wins.
///
/// Requirements: kitchen-buddy-ios 5.1
public struct Tag: Identifiable, Hashable, Codable, Sendable {
    public typealias ID = Tagged<Tag>

    public let id: ID
    public var name: String

    public init(id: ID = ID(), name: String) {
        self.id = id
        self.name = name
    }
}
