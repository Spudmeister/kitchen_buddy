import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, settings by example. Validates: Requirements 18.1, 18.3
@Suite struct PreferencesStoreTests {
    @Test func defaultsThenSaved() throws {
        let book = try TestDatabase.inMemory()
        #expect(try book.preferences.load() == .default)
        let custom = Preferences(unitPreference: .metric, defaultServings: 6, dietarySuggestionsEnabled: false,
                                 groupLibraryByFolder: true, iCloudBackupEnabled: false)
        try book.preferences.save(custom)
        #expect(try book.preferences.load() == custom)
        try book.preferences.save(Preferences(defaultServings: nil))
        #expect(try book.preferences.load().defaultServings == nil)
    }
}
