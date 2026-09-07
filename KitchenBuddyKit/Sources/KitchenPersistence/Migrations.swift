import GRDB

/// The append-only list of schema migrations. Each migration ships with a
/// fixture database from the previous version under
/// `Tests/KitchenPersistenceTests/fixtures/` that must open forever.
enum Migrations {
    static func registerAll(in migrator: inout DatabaseMigrator) {
        // M1 (tasks 1.5) adds "v1-initial": the recipe-book schema, guard
        // triggers, and the FTS5 search projection. Bootstrap keeps the
        // migrator empty so the app installs and opens an empty database.
    }
}
