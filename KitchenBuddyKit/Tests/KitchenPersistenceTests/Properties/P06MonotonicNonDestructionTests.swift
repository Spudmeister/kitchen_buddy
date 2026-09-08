import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 6: Monotonic non-destruction — under any public-API sequence the
/// row counts of recipes, versions, ratings, notes, folders, and tags never
/// decrease. Validates: Requirements 3.5, 17.1
@Suite struct P06MonotonicNonDestructionTests {
    @Test(arguments: 0..<150)
    func countsNeverDecrease(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let driver = BookDriver(book: book)
        var previous = try TableCounts.snapshot(book)
        for operation in BookOperation.sequence(length: 5...40).run(&rng) {
            try driver.apply(operation)
            let current = try TableCounts.snapshot(book)
            #expect(current.isMonotonic(from: previous), "seed \(seed): \(operation) went \(previous) → \(current)")
            previous = current
        }
        // Every recipe ever created is still retrievable with all its versions.
        for id in driver.recipeIDs {
            let detail = try #require(try book.recipes.detail(id), "seed \(seed)")
            #expect(try book.recipes.versions(id).count == detail.recipe.currentVersion, "seed \(seed)")
        }
    }
}
