import KitchenCore

/// Typed navigation destinations for the root `NavigationStack`. Codable so
/// the path survives scene restoration.
public enum Route: Hashable, Codable, Sendable {
    case recipe(Recipe.ID)
    case recipeVersion(Recipe.ID, version: Int)
    case folder(Folder.ID)
    case archived
    case settings
    case backups
}
