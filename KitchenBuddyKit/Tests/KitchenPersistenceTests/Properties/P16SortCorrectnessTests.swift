import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 16: Sort correctness — results are ordered by the sort key in
/// the requested direction, unrated/untimed last, with a stable title then
/// id tiebreak. Validates: Requirements 6.3, 15.4
@Suite struct P16SortCorrectnessTests {
    @Test(arguments: 0..<150)
    func everySortOrdersResults(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        for draft in RecipeGen.drafts(count: 2...12).run(&rng) {
            let detail = try book.recipes.create(draft)
            if Bool.random(using: &rng) { try book.recipes.rate(detail.id, value: Int.random(in: 1...5, using: &rng)) }
            if Gen<Bool>.bool(probability: 0.3).run(&rng) { try book.recipes.setTags(RecipeGen.tags.run(&rng), for: detail.id) }
        }

        for sort in RecipeQuery.Sort.allCases {
            for direction in RecipeQuery.Direction.allCases {
                let results = try book.recipes.summaries(RecipeQuery(sort: sort, direction: direction))
                #expect(results.count == (try book.recipes.count(includeArchived: false)), "seed \(seed)")
                for (a, b) in zip(results, results.dropFirst()) {
                    #expect(Self.ordered(a, b, sort: sort, direction: direction), "seed \(seed): \(sort) \(direction): \(a.title) before \(b.title)")
                }
            }
        }
    }

    static func ordered(_ a: RecipeSummary, _ b: RecipeSummary, sort: RecipeQuery.Sort, direction: RecipeQuery.Direction) -> Bool {
        func compare<T: Comparable>(_ x: T?, _ y: T?) -> Int? {
            switch (x, y) {
            case (nil, nil): return nil
            case (nil, _): return 1     // nulls last, whatever the direction
            case (_, nil): return -1
            case (let x?, let y?):
                if x == y { return nil }
                let ascending = x < y
                return (ascending == (direction == .ascending)) ? -1 : 1
            }
        }
        let primary: Int?
        switch sort {
        case .name: primary = compare(SearchIndex.sortKey(a.title), SearchIndex.sortKey(b.title))
        case .rating: primary = compare(a.latestRating, b.latestRating)
        case .dateAdded: primary = compare(a.createdAt, b.createdAt)
        case .dateUpdated: primary = compare(a.updatedAt, b.updatedAt)
        case .totalTime: primary = compare(a.totalMinutes, b.totalMinutes)
        }
        if let primary { return primary < 0 }
        let titles = (SearchIndex.sortKey(a.title), SearchIndex.sortKey(b.title))
        if titles.0 != titles.1 { return titles.0 < titles.1 }
        return a.id.rawValue <= b.id.rawValue
    }
}
