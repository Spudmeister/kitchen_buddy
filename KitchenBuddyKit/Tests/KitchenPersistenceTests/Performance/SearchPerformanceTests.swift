import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, search stays fast at 5,000 recipes: p95 of a
/// mixed query workload under 50 ms on the Mac runner (the iPhone budget is
/// 100 ms). Validates: Requirements 6.5
@Suite struct SearchPerformanceTests {
    @Test func searchP95UnderBudgetWith5000Recipes() throws {
        var rng = SeededRandomSource(seed: 5_000)
        let book = try TestDatabase.inMemory()
        let drafts = (0..<5_000).map { _ in RecipeGen.draft.run(&rng) }
        try book.importDrafts(drafts)
        #expect(try book.recipes.count(includeArchived: true) == 5_000)

        var queries: [RecipeQuery] = []
        for _ in 0..<40 {
            let word = RecipeGen.word.run(&rng)
            let prefix = String(word.prefix(Int.random(in: 2...max(2, word.count), using: &rng)))
            queries.append(RecipeQuery(text: prefix))
        }
        for _ in 0..<10 {
            queries.append(RecipeQuery(text: RecipeGen.phrase(words: 2...2).run(&rng), tags: [RecipeGen.tag.run(&rng)]))
        }
        for sort in RecipeQuery.Sort.allCases {
            queries.append(RecipeQuery(sort: sort, direction: .descending))
            queries.append(RecipeQuery(tags: [RecipeGen.tag.run(&rng)], minimumRating: nil, maximumTotalMinutes: 60, sort: sort))
        }

        var timings: [Double] = []
        for query in queries {
            let start = DispatchTime.now().uptimeNanoseconds
            let results = try book.recipes.summaries(query)
            let elapsed = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
            timings.append(elapsed)
            #expect(results.count <= SearchIndex.resultLimit)
        }
        timings.sort()
        let p95 = timings[Int(Double(timings.count - 1) * 0.95)]
        #expect(p95 < 50, "p95 \(p95) ms, max \(timings.last ?? 0) ms over \(timings.count) queries")
    }
}
