import Foundation
import Testing
import GRDB
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, Requirement 17.8 (WAL + synchronous FULL,
/// foreign keys on) and the backup-included data directory.
@Suite struct DatabaseStackTests {
    @Test func opensWithDurabilitySettings() throws {
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }

        let pool = try DatabaseStack.open(layout)
        let (journal, sync, fk) = try pool.read { db in
            (try String.fetchOne(db, sql: "PRAGMA journal_mode"),
             try Int.fetchOne(db, sql: "PRAGMA synchronous"),
             try Int.fetchOne(db, sql: "PRAGMA foreign_keys"))
        }
        #expect(journal == "wal")
        #expect(sync == 2) // FULL
        #expect(fk == 1)
        let values = try layout.root.resourceValues(forKeys: [.isExcludedFromBackupKey])
        #expect(values.isExcludedFromBackup == false)
    }
}
