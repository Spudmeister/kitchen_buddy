import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 17: Rating append-only — history is chronological and unchanged
/// by later ratings; the current rating is the latest. Validates: Requirements 15.1–15.3
@Suite struct P17RatingAppendOnlyTests {
    @Test(arguments: 0..<200)
    func historyGrowsAndNeverChanges(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        #expect(try book.recipes.ratings(created.id).isEmpty && created.currentRating == nil)
        var expected: [Int] = []
        var previous: [Rating] = []

        for _ in 0..<Gen<Int>.int(in: 1...8).run(&rng) {
            let value = Int.random(in: 1...5, using: &rng)
            let rating = try book.recipes.rate(created.id, value: value)
            expected.append(value)
            let history = try book.recipes.ratings(created.id)
            #expect(history.map(\.value) == expected, "seed \(seed)")
            #expect(Array(history.prefix(previous.count)) == previous, "seed \(seed): history rewritten")
            #expect(history.last == rating, "seed \(seed)")
            #expect(zip(history, history.dropFirst()).allSatisfy { $0.ratedAt <= $1.ratedAt }, "seed \(seed)")
            #expect(try book.recipes.detail(created.id)?.currentRating == rating, "seed \(seed)")
            #expect(try book.recipes.summaries(.all).first { $0.id == created.id }?.latestRating == value, "seed \(seed)")
            previous = history
        }
    }
}
