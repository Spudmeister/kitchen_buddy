import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, the demo seed goes through the real store.
/// Validates: Requirements 14.1, 14.4
@Suite struct LegacyImportTests {
    @Test func importsEveryFixtureRecipeInOneTransaction() throws {
        let book = try TestDatabase.inMemory()
        let imported = try book.importLegacyV1(try LegacyFixtures.recipesV1Data())
        #expect(imported.count == 34)
        #expect(try book.recipes.count(includeArchived: true) == 34)
        #expect(try book.recipes.summaries(RecipeQuery(text: "brusch")).map(\.title) == ["Bruschetta"])
        #expect(try book.recipes.summaries(RecipeQuery(tags: ["vegetarian", "italian"])).contains { $0.title == "Bruschetta" })
        #expect(try book.tags.all().first { $0.name == "vegetarian" } != nil)
    }

    @Test func aBadRecipeImportsNothing() throws {
        let book = try TestDatabase.inMemory()
        let data = Data("""
        {"recipes":[{"title":"Fine","ingredients":[{"name":"x"}],"instructions":[{"text":"y"}]},
                    {"title":"","ingredients":[],"instructions":[]}]}
        """.utf8)
        #expect(throws: StoreError.self) { try book.importLegacyV1(data) }
        #expect(try book.recipes.count(includeArchived: true) == 0)
    }
}
