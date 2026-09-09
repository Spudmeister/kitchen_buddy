import Foundation
import KitchenCore
import Observation

/// Navigation state: the stack path and the one presented sheet. Screens
/// push routes and present sheets through this; deep links (Spotlight, the
/// share inbox, `kitchenbuddy://`) resolve to the same calls.
@MainActor @Observable
public final class Router {
    public enum Sheet: Identifiable, Hashable {
        case newRecipe(folderID: Folder.ID?)
        case editRecipe(Recipe.ID)
        case tagPicker(Recipe.ID)
        case moveToFolder(Recipe.ID)
        case newFolder(parentID: Folder.ID?)

        public var id: String {
            switch self {
            case .newRecipe(let folderID): return "new-\(folderID?.rawValue ?? "unfiled")"
            case .editRecipe(let id): return "edit-\(id)"
            case .tagPicker(let id): return "tags-\(id)"
            case .moveToFolder(let id): return "move-\(id)"
            case .newFolder(let parentID): return "folder-\(parentID?.rawValue ?? "root")"
            }
        }
    }

    public var path: [Route] = []
    public var presented: Sheet?

    public init() {}

    public func push(_ route: Route) { path.append(route) }
    public func pop() { _ = path.popLast() }
    public func popToRoot() { path.removeAll() }
    public func present(_ sheet: Sheet) { presented = sheet }
    public func dismissSheet() { presented = nil }

    /// Opens a recipe from anywhere (a tap, Spotlight, a URL).
    public func showRecipe(_ id: Recipe.ID) {
        presented = nil
        if path.last != .recipe(id) { path.append(.recipe(id)) }
    }

    // MARK: Scene restoration

    public var encodedPath: Data? {
        get { try? JSONEncoder().encode(path) }
        set { path = newValue.flatMap { try? JSONDecoder().decode([Route].self, from: $0) } ?? [] }
    }
}
