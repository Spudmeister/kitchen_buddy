import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 19: Lineage is a forest — no self-parent, parent immutable, the
/// ancestor walk terminates at the root, a duplicate's v1 equals the
/// source's current version, children are listed (archived ones too).
/// Validates: Requirements 4.1–4.4
@Suite struct P19LineageForestTests {
    @Test(arguments: 0..<150)
    func duplicatesFormAForest(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let root = try book.recipes.create(RecipeGen.draft.run(&rng))
        var chain = [root]
        for _ in 0..<Gen<Int>.int(in: 1...4).run(&rng) {
            let source = chain.last!
            if Bool.random(using: &rng) {
                var draft = source.draft
                draft.content = RecipeGen.edited(draft.content).run(&rng)
                _ = try book.recipes.save(draft, for: source.id)
            }
            let sourceNow = try #require(try book.recipes.detail(source.id))
            let copy = try book.recipes.duplicate(source.id)
            #expect(copy.recipe.parentRecipeID == source.id && copy.id != source.id, "seed \(seed)")
            #expect(copy.recipe.currentVersion == 1, "seed \(seed)")
            #expect(copy.version.content == sourceNow.version.content, "seed \(seed)")
            #expect(copy.tags == sourceNow.tags, "seed \(seed)")
            #expect(copy.photos.isEmpty, "seed \(seed)")
            chain.append(copy)
        }
        let sibling = try book.recipes.duplicate(root.id)
        if Bool.random(using: &rng) { try book.recipes.archive(sibling.id) }

        for (index, recipe) in chain.enumerated() {
            let heritage = try #require(try book.recipes.heritage(recipe.id), "seed \(seed)")
            let expectedAncestors = chain[..<index].reversed().map(\.id)
            #expect(heritage.ancestors.map(\.id) == expectedAncestors, "seed \(seed)")
            #expect(heritage.parent?.id == expectedAncestors.first, "seed \(seed)")
            #expect(heritage.ancestors.last?.id == (index == 0 ? nil : root.id), "seed \(seed)")
            var expectedChildren = index + 1 < chain.count ? [chain[index + 1].id] : []
            if index == 0 { expectedChildren.append(sibling.id) }
            #expect(Set(heritage.children.map(\.id)) == Set(expectedChildren), "seed \(seed)")
            #expect(try book.recipes.detail(recipe.id)?.recipe.parentRecipeID == recipe.recipe.parentRecipeID, "seed \(seed): parent changed")
        }
        let archivedChild = try book.recipes.heritage(root.id)?.children.first { $0.id == sibling.id }
        #expect(archivedChild?.isArchived == (try book.recipes.detail(sibling.id)?.recipe.isArchived), "seed \(seed)")
    }
}
