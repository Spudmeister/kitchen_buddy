/// A tag with the number of non-archived recipes carrying it, for the picker
/// and suggested search tokens.
///
/// Requirements: kitchen-buddy-ios 5.5
public struct TagCount: Hashable, Codable, Sendable {
    public var name: String
    public var count: Int

    public init(name: String, count: Int) {
        self.name = name
        self.count = count
    }
}
