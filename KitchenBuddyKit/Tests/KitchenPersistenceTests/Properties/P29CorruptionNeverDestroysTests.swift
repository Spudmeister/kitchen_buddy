import Foundation
import Testing
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 29: Corruption never destroys — a database failing `quick_check`
/// is renamed aside byte-for-byte, never modified; what opens in its place
/// passes `integrity_check` and equals the newest verified snapshot (or is
/// empty when none exists). Validates: Requirements 17.5
@Suite struct P29CorruptionNeverDestroysTests {
    @Test(arguments: 0..<40)
    func damagedFileIsKeptAndSnapshotRestored(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        let book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        try BookDriver(book: book).apply(BookOperation.sequence(length: 3...15).run(&rng))
        let hasSnapshot = Gen<Bool>.bool(probability: 0.8).run(&rng)
        let expected: BookFingerprint? = hasSnapshot ? try BookFingerprint.of(snapshotAt: try book.backups.snapshot(reason: .manual).url) : nil
        if !hasSnapshot {
            for snapshot in try book.backups.snapshots() { try FileManager.default.removeItem(at: snapshot.url) }
        }
        try book.close()

        let corruption = Gen<Corruption>.element(of: Corruption.allCases).run(&rng)
        try corruption.apply(to: layout.databaseURL, rng: &rng)
        let damagedBytes = try Data(contentsOf: layout.databaseURL)

        let reopened = try RecipeBook.open(layout, clock: TestDatabase.clock())
        defer { try? reopened.close() }
        let integrity = try reopened.writer.read { db in try String.fetchAll(db, sql: "PRAGMA integrity_check") }
        #expect(integrity == ["ok"], "seed \(seed): \(corruption)")

        switch reopened.launchReport {
        case .recovered(let damagedFile, let restoredFrom):
            #expect(try Data(contentsOf: damagedFile) == damagedBytes, "seed \(seed): damaged file was modified")
            #expect(damagedFile.path.hasPrefix(layout.damagedURL.path), "seed \(seed)")
            #expect(try reopened.backups.damagedFiles().contains(damagedFile), "seed \(seed)")
            if let expected {
                #expect(restoredFrom?.isVerified == true, "seed \(seed)")
                #expect(try BookFingerprint.of(reopened) == expected, "seed \(seed): \(corruption)")
            } else {
                #expect(restoredFrom == nil, "seed \(seed)")
                #expect(try reopened.recipes.count(includeArchived: true) == 0, "seed \(seed)")
            }
        case .healthy, .migrated:
            // The damage missed every checked page; the data must still be intact.
            #expect(BackupManager.check(fileAt: layout.databaseURL, minimumRecipeCount: nil).passed, "seed \(seed): \(corruption)")
        }
        _ = try reopened.recipes.create(RecipeGen.draft.run(&rng))
    }
}
