import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 12: Tag association — a tag added to a recipe makes the tag
/// filter return it; a multi-tag filter is a conjunction. Validates: Requirements 5.1, 6.2
@Suite struct P12TagAssociationTests {
    @Test(arguments: 0..<200)
    func tagFiltersAreConjunctions(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let recipes = try RecipeGen.drafts(count: 1...8).run(&rng).map { try book.recipes.create($0) }
        let target = Gen<RecipeDetail>.element(of: recipes).run(&rng)
        let added = Gen<[String]>.array(of: RecipeGen.tag, count: 1...3).run(&rng)
        for tag in added { try book.tags.add(tag, to: target.id) }
        let tags = try book.tags.tags(for: target.id)
        #expect(Set(tags.map(TagName.key)).isSuperset(of: added.map(TagName.key)), "seed \(seed)")

        for tag in added {
            let shouted = Bool.random(using: &rng) ? tag.uppercased() : tag
            #expect(try book.recipes.summaries(RecipeQuery(tags: [shouted])).contains { $0.id == target.id }, "seed \(seed): \(tag)")
        }
        let results = try book.recipes.summaries(RecipeQuery(tags: tags))
        #expect(results.contains { $0.id == target.id }, "seed \(seed)")
        for recipe in recipes {
            let recipeTags = Set(try book.tags.tags(for: recipe.id).map(TagName.key))
            let expected = recipeTags.isSuperset(of: tags.map(TagName.key))
            #expect(results.contains { $0.id == recipe.id } == expected, "seed \(seed): \(recipe.title)")
        }
        let missing = RecipeGen.tagNames.first { !tags.map(TagName.key).contains(TagName.key($0)) }!
        #expect(try book.recipes.summaries(RecipeQuery(tags: tags + [missing])).allSatisfy { $0.id != target.id }, "seed \(seed)")
    }
}
