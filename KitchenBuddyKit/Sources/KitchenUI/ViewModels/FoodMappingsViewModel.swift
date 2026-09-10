import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Settings › Health › Your food mappings: every book-wide correction in
/// force, and a way back to automatic for each.
///
/// Requirements: kitchen-buddy-ios 21.11
@MainActor @Observable
public final class FoodMappingsViewModel {
    public struct Entry: Identifiable, Hashable, Sendable {
        public var ingredientKey: String
        /// nil = don't count.
        public var food: Food?
        public var id: String { ingredientKey }
        public var automaticMatch: Food? { FoodMatcher.match(ingredientKey)?.food }
    }

    public let environment: AppEnvironment
    public private(set) var entries: [Entry] = []
    public var error: String?

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public func load() {
        do {
            let effective = FoodMapping.effective(try environment.book.recipes.foodMappings())
            entries = effective.keys.sorted().map { key in
                Entry(ingredientKey: key, food: effective[key].flatMap { $0 }.flatMap(FoodTable.food(id:)))
            }
        } catch {
            self.error = "\(error)"
        }
    }

    public func resetToAutomatic(_ entry: Entry) {
        do {
            try environment.book.recipes.clearFoodMapping(ingredientName: entry.ingredientKey)
            load()
        } catch {
            self.error = "\(error)"
        }
    }
}
