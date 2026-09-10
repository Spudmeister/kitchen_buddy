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
    /// The newest "servings you get" report, if any (Requirement 20.2).
    public var latestServingReport: ServingReport?

    public init(recipe: Recipe, version: RecipeVersion, tags: [String] = [], currentRating: Rating? = nil,
                photos: [Photo] = [], notes: [RecipeNote] = [], latestServingReport: ServingReport? = nil) {
        self.recipe = recipe
        self.version = version
        self.tags = tags
        self.currentRating = currentRating
        self.photos = photos
        self.notes = notes
        self.latestServingReport = latestServingReport
    }

    /// The latest report's count, else the recipe's own (Requirement 20.2).
    public var effectiveServings: Int? { latestServingReport?.servings ?? version.servings }

    public var id: Recipe.ID { recipe.id }
    public var title: String { version.title }
    public var coverPhoto: Photo? { photos.first }

    /// The editor's starting point for this recipe.
    public var draft: RecipeDraft {
        RecipeDraft(version: version, tags: tags, folderID: recipe.folderID)
    }
}
