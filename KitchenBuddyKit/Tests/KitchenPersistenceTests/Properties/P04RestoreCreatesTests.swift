import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 4: Restore creates, never mutates — restore(k) adds a version
/// equal to k with restoredFromVersion = k and leaves every version intact.
/// Validates: Requirements 2.5
@Suite struct P04RestoreCreatesTests {
    @Test(arguments: 0..<200)
    func restoreAppendsACopy(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        for _ in 0..<Gen<Int>.int(in: 0...4).run(&rng) {
            var draft = try #require(try book.recipes.detail(created.id)).draft
            draft.content = RecipeGen.edited(draft.content).run(&rng)
            _ = try book.recipes.save(draft, for: created.id)
        }
        let before = try book.recipes.versions(created.id)
        let k = Gen<Int>.int(in: 1...before.count).run(&rng)
        let target = try #require(before.first { $0.version == k })

        let restored = try book.recipes.restore(created.id, toVersion: k)
        let after = try book.recipes.versions(created.id)
        #expect(after.count == before.count + 1, "seed \(seed)")
        #expect(Array(after.dropFirst()) == before, "seed \(seed): existing versions changed")
        #expect(restored.version.version == before.count + 1, "seed \(seed)")
        #expect(restored.version.restoredFromVersion == k, "seed \(seed)")
        #expect(restored.version.content == target.content, "seed \(seed)")
        #expect(restored.recipe.currentVersion == before.count + 1, "seed \(seed)")
    }
}
