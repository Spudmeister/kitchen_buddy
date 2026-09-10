import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 36: Health index consistency — `recipe_health` rows after any
/// operation sequence equal a rebuild, every recipe has a row, and the
/// friendly filter returns exactly the low-band recipes.
/// Validates: Requirements 21.8, 21.9
@Suite struct P36HealthIndexConsistencyTests {
    @Test(arguments: 0..<100)
    func incrementalHealthEqualsRebuild(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let driver = BookDriver(book: book)
        try driver.apply(BookOperation.sequence(length: 5...40).run(&rng))

        let before = try book.healthRows()
        #expect(before.count == (try book.recipes.count(includeArchived: true)), "seed \(seed)")
        try book.rebuildSearchIndex()
        #expect(try book.healthRows() == before, "seed \(seed)")

        for profile in HealthProfile.allCases {
            let all = try book.recipes.summaries(RecipeQuery(includeArchived: true))
            let friendly = try book.recipes.summaries(RecipeQuery(includeArchived: true, friendlyProfiles: [profile]))
            let expected = all.filter { $0.health?.band(for: profile) == .low }.map(\.id)
            #expect(friendly.map(\.id) == expected, "seed \(seed) \(profile)")
            for summary in all {
                let live = try #require(try book.recipes.nutrition(summary.id))
                #expect(summary.health?.band(for: profile) == live.score(for: profile).band, "seed \(seed) \(profile)")
            }
        }
    }

    @Test func staleVersionTriggersRebuildAtOpen() throws {
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        var book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        let created = try book.recipes.create(RecipeDraft(title: "Toast", ingredients: [IngredientDraft(name: "bread", quantity: Fraction(2), unit: .piece)],
                                                          instructions: [InstructionDraft(text: "Toast.")], servings: 1))
        try book.writer.write { db in
            try db.execute(sql: "UPDATE recipe_health SET glycemic_load = 999, diabetes_band = 2 WHERE recipe_id = ?", arguments: [created.id.rawValue])
            try PreferencesStore.setValue("0.0.0", forKey: HealthIndex.versionKey, db)
        }
        try book.close()
        book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        let summary = try #require(try book.recipes.summaries(.all).first)
        #expect((summary.health?.glycemicLoad ?? 0) < 100, "a stale version rebuilds the projection")
        #expect(try book.writer.read { db in try PreferencesStore.value(forKey: HealthIndex.versionKey, db) } == HealthIndex.currentVersion)
        try book.close()
    }
}
