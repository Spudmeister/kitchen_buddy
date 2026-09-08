import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 2: Version count — N content edits → N+1 versions, earlier
/// versions unchanged. Validates: Requirements 2.1
@Suite struct P02VersionCountTests {
    @Test(arguments: 0..<200)
    func everyContentEditAddsExactlyOneVersion(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        var history = [created.version]
        let edits = Gen<Int>.int(in: 1...6).run(&rng)

        for n in 1...edits {
            var draft = try #require(try book.recipes.detail(created.id)).draft
            draft.content = RecipeGen.edited(draft.content).run(&rng)
            let saved = try book.recipes.save(draft, for: created.id)
            #expect(saved.recipe.currentVersion == n + 1, "seed \(seed)")
            let versions = try book.recipes.versions(created.id)
            #expect(versions.count == n + 1, "seed \(seed)")
            #expect(Array(versions.reversed().prefix(history.count)) == history, "seed \(seed): earlier versions changed")
            #expect(saved.version.content == draft.content.normalized(), "seed \(seed)")
            history.append(saved.version)
        }
    }
}
