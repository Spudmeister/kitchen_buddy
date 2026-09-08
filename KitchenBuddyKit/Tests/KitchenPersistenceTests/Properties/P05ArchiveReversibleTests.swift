import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 5: Archive reversible and invisible — rows kept; absent from
/// default lists; unarchive restores everything. Validates: Requirements 3.1–3.4
@Suite struct P05ArchiveReversibleTests {
    @Test(arguments: 0..<200)
    func archiveHidesWithoutLosingAnything(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let folder = try book.folders.create(name: "F", parentID: nil)
        var draft = RecipeGen.draft.run(&rng)
        draft.folderID = Bool.random(using: &rng) ? folder.id : nil
        let created = try book.recipes.create(draft)
        for _ in 0..<Gen<Int>.int(in: 0...3).run(&rng) { try book.recipes.rate(created.id, value: Int.random(in: 1...5, using: &rng)) }
        for _ in 0..<Gen<Int>.int(in: 0...3).run(&rng) { try book.recipes.addNote(to: created.id, body: "n", cookedOn: nil) }
        let other = try book.recipes.create(RecipeGen.draft.run(&rng))

        let before = try #require(try book.recipes.detail(created.id))
        let counts = try TableCounts.snapshot(book)
        let tag = before.tags.first

        try book.recipes.archive(created.id)
        #expect(try TableCounts.snapshot(book) == counts, "seed \(seed)")
        let hidden = try #require(try book.recipes.detail(created.id))
        #expect(hidden.recipe.isArchived, "seed \(seed)")
        #expect(try book.recipes.summaries(.all).map(\.id) == [other.id], "seed \(seed)")
        #expect(try book.recipes.summaries(RecipeQuery(text: before.title)).allSatisfy { $0.id != created.id }, "seed \(seed)")
        if let tag { #expect(try book.recipes.summaries(RecipeQuery(tags: [tag])).allSatisfy { $0.id != created.id }, "seed \(seed)") }
        #expect(try book.recipes.summaries(RecipeQuery(folderID: folder.id)).allSatisfy { $0.id != created.id }, "seed \(seed)")
        #expect(try book.recipes.summaries(RecipeQuery(includeArchived: true)).contains { $0.id == created.id }, "seed \(seed)")
        #expect(try book.folders.recipeCounts()[folder.id] == 0, "seed \(seed)")

        try book.recipes.unarchive(created.id)
        let after = try #require(try book.recipes.detail(created.id))
        #expect(!after.recipe.isArchived, "seed \(seed)")
        #expect(after.recipe.folderID == before.recipe.folderID, "seed \(seed)")
        #expect(after.version == before.version && after.tags == before.tags, "seed \(seed)")
        #expect(after.currentRating == before.currentRating && after.notes == before.notes, "seed \(seed)")
        #expect(try book.recipes.ratings(created.id) == (try book.recipes.ratings(created.id)), "seed \(seed)")
        #expect(try book.recipes.summaries(.all).contains { $0.id == created.id }, "seed \(seed)")
        #expect(try TableCounts.snapshot(book) == counts, "seed \(seed)")
    }
}
