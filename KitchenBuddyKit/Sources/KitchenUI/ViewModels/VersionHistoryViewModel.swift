import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Version History: every version newest-first with a one-line summary of
/// what changed from the one before, and restore (which appends).
///
/// Requirements: kitchen-buddy-ios 2.3–2.5
@MainActor @Observable
public final class VersionHistoryViewModel {
    public struct Entry: Identifiable, Hashable {
        public let version: RecipeVersion
        public let summary: String
        public let isCurrent: Bool
        public var id: Int { version.version }
    }

    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public private(set) var entries: [Entry] = []
    public private(set) var currentVersion = 0
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        do {
            let book = environment.book
            let versions = try book.recipes.versions(recipeID)
            currentVersion = try book.recipes.detail(recipeID)?.recipe.currentVersion ?? 0
            let byNumber = Dictionary(uniqueKeysWithValues: versions.map { ($0.version, $0) })
            entries = versions.map { version in
                Entry(version: version,
                      summary: Self.summary(of: version, previous: byNumber[version.version - 1]),
                      isCurrent: version.version == currentVersion)
            }
        } catch {
            self.error = "\(error)"
        }
    }

    /// Restore creates a new version equal to `number` (never mutates).
    @discardableResult
    public func restore(_ number: Int) -> Bool {
        do {
            _ = try environment.book.recipes.restore(recipeID, toVersion: number)
            load()
            return true
        } catch {
            self.error = "\(error)"
            return false
        }
    }

    /// "Restored from v2", "Title changed, 2 ingredients added", "First version".
    static func summary(of version: RecipeVersion, previous: RecipeVersion?) -> String {
        if let restored = version.restoredFromVersion { return "Restored from v\(restored)" }
        guard let previous else { return "First version" }
        var parts: [String] = []
        if version.title != previous.title { parts.append("Title changed") }
        if version.description != previous.description { parts.append("Description changed") }
        let ingredientDelta = version.ingredients.count - previous.ingredients.count
        if ingredientDelta > 0 { parts.append("\(ingredientDelta) ingredient\(ingredientDelta == 1 ? "" : "s") added") }
        if ingredientDelta < 0 { parts.append("\(-ingredientDelta) ingredient\(ingredientDelta == -1 ? "" : "s") removed") }
        if ingredientDelta == 0, version.ingredients.map(\.draft) != previous.ingredients.map(\.draft) { parts.append("Ingredients changed") }
        let stepDelta = version.instructions.count - previous.instructions.count
        if stepDelta > 0 { parts.append("\(stepDelta) step\(stepDelta == 1 ? "" : "s") added") }
        if stepDelta < 0 { parts.append("\(-stepDelta) step\(stepDelta == -1 ? "" : "s") removed") }
        if stepDelta == 0, version.instructions.map(\.draft) != previous.instructions.map(\.draft) { parts.append("Steps changed") }
        if version.servings != previous.servings { parts.append("Servings changed") }
        if version.prepMinutes != previous.prepMinutes || version.cookMinutes != previous.cookMinutes { parts.append("Times changed") }
        if version.sourceURL != previous.sourceURL { parts.append("Source changed") }
        return parts.isEmpty ? "No content change" : parts.joined(separator: ", ")
    }
}
