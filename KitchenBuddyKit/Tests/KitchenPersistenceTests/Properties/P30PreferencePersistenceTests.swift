import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 30: Preference persistence — settings survive closing and
/// reopening the database. Validates: Requirements 18.3
@Suite struct P30PreferencePersistenceTests {
    @Test(arguments: 0..<40)
    func preferencesSurviveReopen(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let preferences = Preferences(
            unitPreference: Gen<UnitPreference>.element(of: UnitPreference.allCases).run(&rng),
            defaultServings: Gen<Int>.int(in: 1...12).optional().run(&rng) ?? nil,
            dietarySuggestionsEnabled: Bool.random(using: &rng),
            groupLibraryByFolder: Bool.random(using: &rng),
            iCloudBackupEnabled: Bool.random(using: &rng))
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        #expect(try book.preferences.load() == .default)
        try book.preferences.save(preferences)
        try book.close()

        let reopened = try RecipeBook.open(layout)
        #expect(try reopened.preferences.load() == preferences, "seed \(seed)")
        try reopened.close()
    }
}
