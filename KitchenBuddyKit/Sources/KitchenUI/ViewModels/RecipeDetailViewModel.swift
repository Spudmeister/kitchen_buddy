import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Recipe Detail state for the current version (or a chosen past version,
/// read-only). Ingredient checks are view state and clear on leaving.
///
/// Requirements: kitchen-buddy-ios 3.1, 3.4, 10.1–10.3, 15.1
@MainActor @Observable
public final class RecipeDetailViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    /// A past version to show read-only; nil for the current one.
    public let versionNumber: Int?
    public private(set) var detail: RecipeDetail?
    public private(set) var folderName: String?
    public private(set) var isMissing = false
    public var checked: Set<Ingredient.ID> = []
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID, versionNumber: Int? = nil) {
        self.environment = environment
        self.recipeID = recipeID
        self.versionNumber = versionNumber
    }

    public var isArchived: Bool { detail?.recipe.isArchived == true }
    public var isPastVersion: Bool { versionNumber != nil }
    /// Archived recipes and past versions are read-only.
    public var isReadOnly: Bool { isArchived || isPastVersion }

    public func load() {
        do {
            let book = environment.book
            detail = try versionNumber.map { try book.recipes.detail(recipeID, version: $0) } ?? (try book.recipes.detail(recipeID))
            isMissing = detail == nil
            folderName = try detail?.recipe.folderID.flatMap { try book.folders.folder($0) }?.name
        } catch {
            self.error = "\(error)"
        }
    }

    public func toggle(_ ingredient: Ingredient) {
        if !checked.insert(ingredient.id).inserted { checked.remove(ingredient.id) }
    }

    public func rate(_ value: Int) {
        perform { try $0.recipes.rate(recipeID, value: value) }
    }

    public func archive() {
        perform { try $0.recipes.archive(recipeID) }
    }

    public func unarchive() {
        perform { try $0.recipes.unarchive(recipeID) }
    }

    @discardableResult
    public func duplicate() -> Recipe.ID? {
        do {
            return try environment.book.recipes.duplicate(recipeID).id
        } catch {
            self.error = "\(error)"
            return nil
        }
    }

    public func setTags(_ tags: [String]) {
        perform { try $0.recipes.setTags(tags, for: recipeID) }
    }

    public func move(to folderID: Folder.ID?) {
        perform { try $0.recipes.move(recipeID, toFolder: folderID) }
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
