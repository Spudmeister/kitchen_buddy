import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Folder management: the tree with subtree recipe counts, rename, move
/// (cycles rejected by the store and surfaced here), soft delete that
/// moves contents to the parent, and multi-select moves of recipes.
///
/// Requirements: kitchen-buddy-ios 16.1–16.6
@MainActor @Observable
public final class FolderBrowserViewModel {
    public let environment: AppEnvironment
    public private(set) var folders: [Folder] = []
    public private(set) var counts: [Folder.ID: Int] = [:]
    public var error: String?

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public func load() {
        do {
            folders = try environment.book.folders.all()
            counts = try environment.book.folders.recipeCounts()
        } catch {
            self.error = "\(error)"
        }
    }

    public func children(of parentID: Folder.ID?) -> [Folder] {
        folders.filter { $0.parentID == parentID }
            .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    public func folder(_ id: Folder.ID) -> Folder? { folders.first { $0.id == id } }

    public func count(of id: Folder.ID) -> Int { counts[id] ?? 0 }

    /// Every live folder except `id` and its descendants: legal move targets.
    public func moveTargets(for id: Folder.ID) -> [FolderTree.Node] {
        let excluded = Set((try? environment.book.folders.subtree(of: id)) ?? [id])
        return FolderTree.flattened(folders).filter { !excluded.contains($0.id) }
    }

    public func rename(_ id: Folder.ID, to name: String) {
        perform { _ = try $0.folders.rename(id, to: name) }
    }

    /// Returns false (with `error` set) for a move into itself or a child.
    @discardableResult
    public func move(_ id: Folder.ID, toParent parentID: Folder.ID?) -> Bool {
        do {
            _ = try environment.book.folders.move(id, toParent: parentID)
            load()
            return true
        } catch StoreError.folderCycle {
            error = "A folder can't be moved into itself or one of its own subfolders."
            return false
        } catch {
            self.error = "\(error)"
            return false
        }
    }

    /// Soft delete: recipes and subfolders move to the parent (or Unfiled).
    public func delete(_ id: Folder.ID) {
        perform { try $0.folders.delete(id) }
    }

    public func move(recipes ids: [Recipe.ID], to folderID: Folder.ID?) {
        perform { book in
            for id in ids { try book.recipes.move(id, toFolder: folderID) }
        }
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            load()
        } catch {
            self.error = "\(error)"
        }
    }
}
