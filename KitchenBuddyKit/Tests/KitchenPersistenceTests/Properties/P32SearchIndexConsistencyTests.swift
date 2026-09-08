import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 32: Search index consistency — the incrementally maintained
/// `recipe_search` rows equal rebuilt rows after any operation sequence,
/// and queries answer the same before and after a rebuild. Validates: Requirements 6.1
@Suite struct P32SearchIndexConsistencyTests {
    @Test(arguments: 0..<150)
    func incrementalIndexEqualsRebuild(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let driver = BookDriver(book: book)
        try driver.apply(BookOperation.sequence(length: 5...40).run(&rng))

        let queries = (0..<5).map { _ in RecipeQuery(text: String(RecipeGen.word.run(&rng).prefix(3)), includeArchived: Bool.random(using: &rng)) }
            + [RecipeQuery(tags: [RecipeGen.tag.run(&rng)]), RecipeQuery(sort: .dateUpdated, direction: .descending)]
        let rowsBefore = try book.searchRows()
        let resultsBefore = try queries.map { try book.recipes.summaries($0) }
        #expect(rowsBefore.count == (try book.recipes.count(includeArchived: true)), "seed \(seed)")

        try book.rebuildSearchIndex()
        #expect(try book.searchRows() == rowsBefore, "seed \(seed)")
        #expect(try queries.map { try book.recipes.summaries($0) } == resultsBefore, "seed \(seed)")
    }
}
