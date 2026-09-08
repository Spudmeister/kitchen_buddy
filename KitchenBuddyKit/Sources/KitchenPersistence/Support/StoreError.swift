import KitchenCore

/// Errors the stores throw. Every case is a caller mistake or a rejected
/// operation; database failures propagate as their own errors.
public enum StoreError: Error, Hashable, Sendable {
    case recipeNotFound(Recipe.ID)
    case versionNotFound(Recipe.ID, version: Int)
    case folderNotFound(Folder.ID)
    case noteNotFound(RecipeNote.ID)
    case invalidDraft([RecipeDraft.ValidationError])
    case invalidRating(Int)
    case emptyFolderName
    /// Moving a folder into itself or one of its descendants.
    case folderCycle
    case emptyTagName
}
