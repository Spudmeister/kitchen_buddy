import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 18: Rating filter/sort — filtered results are ≥ the minimum with
/// none missing; sorting by rating is by current rating with unrated last.
/// Validates: Requirements 15.4
@Suite struct P18RatingFilterSortTests {
    @Test(arguments: 0..<150)
    func minimumRatingAndRatingSort(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        var current: [Recipe.ID: Int] = [:]
        for draft in RecipeGen.drafts(count: 1...12).run(&rng) {
            let detail = try book.recipes.create(draft)
            for _ in 0..<Gen<Int>.int(in: 0...3).run(&rng) {
                let value = Int.random(in: 1...5, using: &rng)
                try book.recipes.rate(detail.id, value: value)
                current[detail.id] = value
            }
        }
        let minimum = Int.random(in: 1...5, using: &rng)
        let filtered = try book.recipes.summaries(RecipeQuery(minimumRating: minimum))
        #expect(filtered.allSatisfy { ($0.latestRating ?? 0) >= minimum }, "seed \(seed)")
        let expected = Set(current.filter { $0.value >= minimum }.map(\.key))
        #expect(Set(filtered.map(\.id)) == expected, "seed \(seed)")

        let sorted = try book.recipes.summaries(RecipeQuery(sort: .rating, direction: .descending))
        let ratings = sorted.map(\.latestRating)
        let rated = ratings.compactMap { $0 }
        #expect(zip(rated, rated.dropFirst()).allSatisfy { $0 >= $1 }, "seed \(seed): \(ratings)")
        #expect(ratings.drop(while: { $0 != nil }).allSatisfy { $0 == nil }, "seed \(seed): unrated not last")
        for summary in sorted { #expect(summary.latestRating == current[summary.id], "seed \(seed)") }
    }
}
