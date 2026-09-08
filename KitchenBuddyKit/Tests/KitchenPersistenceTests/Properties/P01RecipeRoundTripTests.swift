import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 1: Recipe round-trip — create then fetch returns an equal recipe
/// (all fields, exact rationals, order). Validates: Requirements 1.1, 1.6
@Suite struct P01RecipeRoundTripTests {
    @Test(arguments: 0..<250)
    func createThenFetchIsEqual(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let folder = Gen<Bool>.bool(probability: 0.3).run(&rng) ? try book.folders.create(name: "F", parentID: nil) : nil
        var draft = RecipeGen.draft.run(&rng)
        draft.folderID = folder?.id
        let expected = draft.normalized()

        let created = try book.recipes.create(draft)
        let fetched = try #require(try book.recipes.detail(created.id), "seed \(seed)")
        #expect(fetched == created, "seed \(seed)")
        #expect(fetched.version.content == expected.content, "seed \(seed)")
        #expect(fetched.version.ingredients.map(\.quantity) == expected.content.ingredients.map(\.quantity), "seed \(seed)")
        #expect(fetched.version.instructions.map(\.step) == Array(1...max(1, expected.content.instructions.count)), "seed \(seed)")
        #expect(Set(fetched.tags.map(TagName.key)) == Set(expected.tags.map(TagName.key)), "seed \(seed)")
        #expect(fetched.recipe.folderID == folder?.id, "seed \(seed)")
        #expect(fetched.draft.normalized().content == expected.content, "seed \(seed)")

        let summary = try #require(try book.recipes.summaries(.all).first, "seed \(seed)")
        #expect(summary.title == expected.content.title && summary.totalMinutes == expected.content.totalMinutes, "seed \(seed)")
    }
}
