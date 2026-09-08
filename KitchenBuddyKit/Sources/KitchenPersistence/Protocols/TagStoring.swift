import KitchenCore

/// Tags: case-insensitive names, counts for the picker and search tokens.
///
/// Requirements: kitchen-buddy-ios 5.1, 5.5
public protocol TagStoring: Sendable {
    /// Every tag with its non-archived recipe count, most used first.
    func all() throws -> [TagCount]
    /// Tags whose name starts with `prefix` (case-insensitive), most used first.
    func suggestions(prefix: String) throws -> [TagCount]
    func tags(for recipeID: Recipe.ID) throws -> [String]
    func add(_ tag: String, to recipeID: Recipe.ID) throws
    func remove(_ tag: String, from recipeID: Recipe.ID) throws
}
