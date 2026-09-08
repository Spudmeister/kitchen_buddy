import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, Settings behaviour at the view-model level.
/// Validates: Requirements 18.1, 18.3, 18.4
@Suite struct SettingsViewModelTests {
    @Test @MainActor func preferenceChangesPersistImmediately() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let environment = AppEnvironment(book: book, cloud: CloudMirror(layout: layout, containerURL: { nil }))
        let model = SettingsViewModel(environment: environment)
        model.preferences.unitPreference = .metric
        model.preferences.defaultServings = 6
        model.save()
        #expect(try book.preferences.load().unitPreference == .metric)
        #expect(environment.preferences.defaultServings == 6)
    }

    @Test @MainActor func samplesLoadOnlyIntoAnEmptyBook() async throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let environment = AppEnvironment(book: book, cloud: CloudMirror(layout: layout, containerURL: { nil }),
                                         sampleRecipes: try LegacyFixtures.recipesV1Data())
        let model = SettingsViewModel(environment: environment)
        model.refresh()
        #expect(model.canLoadSamples)
        await model.loadSampleRecipes()
        #expect(model.recipeCount == 34)
        #expect(!model.canLoadSamples)
        #expect(try book.backups.snapshots().contains { $0.reason == .preImport })
        await model.loadSampleRecipes()
        #expect(model.recipeCount == 34)
        await model.rebuildSearchIndex()
        #expect(model.message == "Search index rebuilt.")
    }
}
