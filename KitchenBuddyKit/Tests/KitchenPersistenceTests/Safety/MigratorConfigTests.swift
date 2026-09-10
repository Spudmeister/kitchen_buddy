import Testing
import GRDB
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, the migrator never erases and the migration
/// list only grows. Validates: iron rule 2 (ADR-003)
@Suite struct MigratorConfigTests {
    @Test func neverErasesAndListIsPinned() throws {
        let migrator = DatabaseStack.migrator
        #expect(migrator.eraseDatabaseOnSchemaChange == false)
        #expect(migrator.migrations == Migrations.identifiers)
        #expect(Migrations.identifiers == ["v1-initial", "v2-rating-clears", "v3-health"])

        let book = try TestDatabase.inMemory()
        let applied = try book.writer.read { db in try migrator.appliedMigrations(db) }
        #expect(applied == Migrations.identifiers)
        #expect(try book.writer.read { db in try migrator.hasCompletedMigrations(db) })
    }

    @Test func schemaHasEveryGuardTrigger() throws {
        let book = try TestDatabase.inMemory()
        let triggers = try book.writer.read { db in
            try String.fetchAll(db, sql: "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'guard_%'")
        }
        let expected = ["recipes", "recipe_versions", "ingredients", "instructions", "recipe_notes", "photos", "ratings", "rating_clears",
                        "folders", "tags", "serving_reports", "food_overrides"]
            .map { "guard_\($0)_delete" }
            + ["recipe_versions", "ingredients", "instructions", "ratings", "rating_clears", "serving_reports", "food_overrides"].map { "guard_\($0)_update" }
            + ["guard_recipes_parent_immutable"]
        #expect(Set(triggers) == Set(expected))
    }
}
