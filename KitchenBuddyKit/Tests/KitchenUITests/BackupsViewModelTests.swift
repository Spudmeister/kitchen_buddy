import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, Backups screen behaviour at the view-model
/// level. Validates: Requirements 17.2, 17.6, 17.7, 18.4
@Suite struct BackupsViewModelTests {
    @Test @MainActor func backUpRestoreAndCloudRoundTrip() async throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let container = layout.root.appendingPathComponent("cloud", isDirectory: true)
        let environment = AppEnvironment(book: book, cloud: CloudMirror(layout: layout, clock: TestDatabase.clock(), containerURL: { container }))
        let model = BackupsViewModel(environment: environment)
        let first = try book.recipes.create(RecipeDraft(title: "First", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))

        await model.backUpNow()
        #expect(model.snapshots.first?.reason == .manual && model.snapshots.first?.isVerified == true)
        #expect(model.message?.contains("1 recipes") == true)
        let manual = try #require(model.snapshots.first)

        _ = try book.recipes.create(RecipeDraft(title: "Second", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        await model.backUpNow()
        await model.copyToCloudNow()
        await model.loadCloudSnapshots()
        #expect(model.cloudSnapshots.count == 1)

        await model.restore(manual)
        #expect(try book.recipes.summaries(.all).map(\.id) == [first.id])
        #expect(model.snapshots.contains { $0.reason == .preRestore })

        _ = try book.recipes.create(RecipeDraft(title: "Third", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        await model.restoreFromCloud(model.cloudSnapshots[0])
        #expect(try book.recipes.count(includeArchived: true) == 2, "the cloud copy holds First and Second")
        #expect(model.damagedFiles.isEmpty)
    }
}
