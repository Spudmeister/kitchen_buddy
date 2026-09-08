/// Lineage of a duplicated recipe: its parent, the chain to the root, and
/// the recipes duplicated from it (archived ones included, flagged).
///
/// Requirements: kitchen-buddy-ios 4.3, 4.4
public struct RecipeHeritage: Hashable, Codable, Sendable {
    public var recipe: RecipeSummary
    public var parent: RecipeSummary?
    /// Nearest first, root last. Empty for an original.
    public var ancestors: [RecipeSummary]
    public var children: [RecipeSummary]

    public init(recipe: RecipeSummary, parent: RecipeSummary? = nil,
                ancestors: [RecipeSummary] = [], children: [RecipeSummary] = []) {
        self.recipe = recipe
        self.parent = parent
        self.ancestors = ancestors
        self.children = children
    }
}
