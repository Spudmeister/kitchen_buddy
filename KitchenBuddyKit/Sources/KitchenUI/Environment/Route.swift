import KitchenCore

/// Typed navigation destinations for the root `NavigationStack`. Codable so
/// the path survives scene restoration.
public enum Route: Hashable, Codable, Sendable {
    case recipe(Recipe.ID)
    case recipeVersion(Recipe.ID, version: Int)
    case folder(Folder.ID)
    case folders
    case history(Recipe.ID)
    case lineage(Recipe.ID)
    case notes(Recipe.ID)
    case photos(Recipe.ID)
    case archived
    case settings
    case backups
    /// The health worksheet for a recipe (M11).
    case health(Recipe.ID)
    /// Settings › Health › Sources & thresholds (M11).
    case healthSources
    /// Settings › Health › Your food mappings (M10.8).
    case foodMappings
}
