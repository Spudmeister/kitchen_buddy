import Foundation
import Testing
import GRDB
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, Requirement 17.8 (WAL + synchronous FULL,
/// foreign keys on) and the never-erase migrator rule.
@Suite struct DatabaseStackTests {
    @Test func opensWithDurabilitySettings() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("kb-test-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let pool = try DatabaseStack.open(DatabaseStack.Layout(root: root))
        let (journal, sync, fk) = try pool.read { db in
            (try String.fetchOne(db, sql: "PRAGMA journal_mode"),
             try Int.fetchOne(db, sql: "PRAGMA synchronous"),
             try Int.fetchOne(db, sql: "PRAGMA foreign_keys"))
        }
        #expect(journal == "wal")
        #expect(sync == 2) // FULL
        #expect(fk == 1)
        let values = try root.resourceValues(forKeys: [.isExcludedFromBackupKey])
        #expect(values.isExcludedFromBackup == false)
    }

    @Test func migratorNeverErases() {
        #expect(DatabaseStack.migrator.eraseDatabaseOnSchemaChange == false)
    }

    @Test func fixtureRecipesAreReadable() throws {
        let url = try #require(Bundle.module.url(forResource: "recipes-v1", withExtension: "json", subdirectory: "fixtures"))
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
        #expect((object?.count ?? 0) >= 30)
        #expect(object?["minimalRecipe"] != nil)
    }
}
