import GRDB

/// The append-only list of schema migrations. Each migration ships with a
/// fixture database from the previous version under
/// `Tests/KitchenPersistenceTests/fixtures/` that must open forever.
/// Migrations only add: tables, columns, indexes, triggers, backfills.
enum Migrations {
    /// Registered migration identifiers, in order. Tests pin this list so a
    /// rename or removal is caught.
    static let identifiers: [String] = ["v1-initial", "v2-rating-clears", "v3-health"]

    static func registerAll(in migrator: inout DatabaseMigrator) {
        migrator.registerMigration("v1-initial") { db in
            try db.execute(sql: SchemaV1.sql)
        }
        migrator.registerMigration("v2-rating-clears") { db in
            try db.execute(sql: SchemaV2.sql)
        }
        migrator.registerMigration("v3-health") { db in
            try db.execute(sql: SchemaV3.sql)
        }
    }
}
