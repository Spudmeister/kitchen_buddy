import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 14: Word-prefix search coverage — any word (≥ 2 chars) or prefix
/// from the title, description, ingredient names, steps, or tags finds the
/// recipe; archived recipes only with the include-archived token.
/// Validates: Requirements 6.1
@Suite struct P14WordPrefixSearchTests {
    @Test(arguments: 0..<200)
    func everyWordPrefixFindsTheRecipe(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let decoys = try RecipeGen.drafts(count: 0...5).run(&rng).map { try book.recipes.create($0) }
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        let content = created.version.content

        var words = searchWords(in: content.title)
        words += searchWords(in: content.description ?? "")
        words += content.ingredients.flatMap { searchWords(in: $0.name) }
        words += content.instructions.flatMap { searchWords(in: $0.text) }
        words += created.tags.flatMap(searchWords(in:))
        #expect(!words.isEmpty)

        for word in Set(words) {
            let prefix = String(word.prefix(Int.random(in: 2...word.count, using: &rng)))
            let query = Bool.random(using: &rng) ? prefix.uppercased() : prefix
            let ids = try book.recipes.summaries(RecipeQuery(text: query)).map(\.id)
            #expect(ids.contains(created.id), "seed \(seed): '\(query)' from '\(word)' missed \(created.title)")
        }

        try book.recipes.archive(created.id)
        let word = words[0]
        #expect(!(try book.recipes.summaries(RecipeQuery(text: word)).map(\.id)).contains(created.id), "seed \(seed)")
        #expect(try book.recipes.summaries(RecipeQuery(text: word, includeArchived: true)).map(\.id).contains(created.id), "seed \(seed)")
        _ = decoys
    }
}
