import Foundation
import Testing
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, snapshots by example. Validates: Requirements 17.2–17.4, 17.7
@Suite struct BackupManagerTests {
    @Test func snapshotIsWrittenVerifiedAndListed() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        try book.importDrafts(Array(try LegacyFixtures.recipesV1().prefix(3)))

        let snapshot = try book.backups.snapshot(reason: .manual)
        #expect(snapshot.isVerified)
        #expect(snapshot.reason == .manual)
        #expect(snapshot.verification?.recipeCount == 3)
        #expect(snapshot.fileName.hasPrefix("kb-") && snapshot.fileName.hasSuffix("-manual.sqlite"))
        #expect(Snapshot.parse(fileName: snapshot.fileName)?.createdAt == snapshot.createdAt)

        let listed = try book.backups.snapshots()
        #expect(listed.map(\.id) == [snapshot.id, try #require(listed.last).id])   // manual + pre-import
        #expect(listed.allSatisfy { $0.isVerified })
        // A fresh manager over the same directory sees the cached verification.
        #expect(try BackupManager.snapshots(in: layout).first?.isVerified == true)
        #expect(try book.backups.newestVerified()?.id == snapshot.id)
    }

    @Test func aBadFileIsRenamedAsideAndNeverRestored() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let fake = layout.backupsURL.appendingPathComponent(Snapshot.fileName(createdAt: Date(), reason: .manual))
        try Data("garbage".utf8).write(to: fake)

        let listed = try #require(try book.backups.snapshots().first)
        #expect(listed.verification == nil)
        let verified = try book.backups.verify(listed)
        #expect(!verified.isVerified && verified.isBad)
        #expect(verified.url.pathExtension == "bad")
        #expect(!FileManager.default.fileExists(atPath: fake.path))
        #expect(FileManager.default.fileExists(atPath: verified.url.path))
        #expect(try book.backups.newestVerified() == nil)
        #expect(throws: BackupError.snapshotNotVerified(fileName: verified.fileName)) { try book.restore(from: verified) }
        try book.backups.prune()
        #expect(FileManager.default.fileExists(atPath: verified.url.path), "bad files are evidence, never pruned")
    }

    @Test func triggersHonourChangesAndIntervals() throws {
        let clock = ManualClock()
        let (book, layout) = try TestDatabase.onDisk(clock: clock.clock)
        defer { TestDatabase.remove(layout) }
        #expect(try book.backups.snapshotIfDue(.background) == nil, "no changes yet")
        #expect(try book.backups.snapshotIfDue(.daily) != nil, "no snapshot at all → daily")
        clock.advance(by: 600)
        #expect(try book.backups.snapshotIfDue(.daily) == nil)

        _ = try book.recipes.create(RecipeDraft(title: "T", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        #expect(try book.backups.hasChangesSinceLastSnapshot())
        #expect(try book.backups.snapshotIfDue(.background) == nil, "less than an hour since the last snapshot")
        clock.advance(by: 3_600)
        let background = try #require(try book.backups.snapshotIfDue(.background))
        #expect(background.reason == .background && background.verification?.recipeCount == 1)
        #expect(!(try book.backups.hasChangesSinceLastSnapshot()))
        clock.advance(by: 3_600)
        #expect(try book.backups.snapshotIfDue(.background) == nil, "nothing changed")
        clock.advance(by: 86_400)
        #expect(try book.backups.snapshotIfDue(.daily)?.reason == .daily)
    }

    @Test func restoreSwapsTheFileAndKeepsASafetyCopy() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let first = try book.recipes.create(RecipeDraft(title: "First", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        let snapshot = try book.backups.snapshot(reason: .manual)
        let second = try book.recipes.create(RecipeDraft(title: "Second", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))

        let preRestore = try book.restore(from: snapshot)
        #expect(preRestore.reason == .preRestore && preRestore.verification?.recipeCount == 2)
        #expect(try book.recipes.detail(first.id) != nil)
        #expect(try book.recipes.detail(second.id) == nil)
        #expect(try book.recipes.summaries(.all).map(\.title) == ["First"])
        // The book keeps working on the new file.
        let third = try book.recipes.create(RecipeDraft(title: "Third", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        #expect(try book.recipes.summaries(.all).map(\.title) == ["First", "Third"])
        #expect(try BookFingerprint.of(snapshotAt: preRestore.url).rows["recipes"]?.count == 2)
        _ = third
        try book.close()
    }

    @Test func upgradeFromAnEmptyM0DatabaseSnapshotsFirst() throws {
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        try DatabaseStack.prepareDirectories(layout)
        // Build 32 shipped a database with no migrations at all.
        let m0 = try DatabaseStack.openWithoutMigrating(layout)
        try m0.write { db in try db.execute(sql: "CREATE TABLE IF NOT EXISTS grdb_migrations (identifier TEXT NOT NULL PRIMARY KEY)") }
        try m0.close()

        let book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        guard case .migrated(let snapshot?) = book.launchReport else {
            Issue.record("expected a pre-migration snapshot, got \(book.launchReport)")
            return
        }
        #expect(snapshot.reason == .preMigration && snapshot.isVerified)
        #expect(try book.recipes.count(includeArchived: true) == 0)
        try book.close()

        let reopened = try RecipeBook.open(layout, clock: TestDatabase.clock())
        #expect(reopened.launchReport == .healthy)
        try reopened.close()
    }

    @Test func newInstallReportsMigratedWithoutASnapshot() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        #expect(book.launchReport == .migrated(preMigrationSnapshot: nil))
        #expect(try book.backups.snapshots().isEmpty)
    }
}
