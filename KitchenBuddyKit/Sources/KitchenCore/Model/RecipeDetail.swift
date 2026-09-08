/// Everything the detail screen shows for one recipe at its current (or a
/// chosen) version.
///
/// Requirements: kitchen-buddy-ios 10.1
public struct RecipeDetail: Identifiable, Hashable, Codable, Sendable {
    public var recipe: Recipe
    public var version: RecipeVersion
    public var tags: [String]
    public var currentRating: Rating?
    /// Non-removed photos in sort order; the first is the cover.
    public var photos: [Photo]
    /// Non-deleted notes, pinned first then newest first.
    public var notes: [RecipeNote]

    public init(recipe: Recipe, version: RecipeVersion, tags: [String] = [], currentRating: Rating? = nil,
                photos: [Photo] = [], notes: [RecipeNote] = []) {
        self.recipe = recipe
        self.version = version
        self.tags = tags
        self.currentRating = currentRating
        self.photos = photos
        self.notes = notes
    }

    public var id: Recipe.ID { recipe.id }
    public var title: String { version.title }
    public var coverPhoto: Photo? { photos.first }

    /// The editor's starting point for this recipe.
    public var draft: RecipeDraft {
        RecipeDraft(version: version, tags: tags, folderID: recipe.folderID)
    }
}
