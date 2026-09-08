import Foundation
import GRDB

/// Opens the recipe database with the settings the data-safety design
/// (ADR-003) requires.
///
/// Durability over speed: WAL with `synchronous = FULL` (recipe writes are
/// tiny and rare; power-loss durability matters more), foreign keys on, and
/// `eraseDatabaseOnSchemaChange` is never enabled — not even in DEBUG.
///
/// Requirements: kitchen-buddy-ios 17.1, 17.8
public enum DatabaseStack {
    public static let fileName = "kitchenbuddy.sqlite"

    /// Directory layout under Application Support (created on demand).
    public struct Layout: Hashable, Sendable {
        public let root: URL
        public var databaseURL: URL { root.appendingPathComponent(DatabaseStack.fileName) }
        public var backupsURL: URL { root.appendingPathComponent("Backups", isDirectory: true) }
        public var damagedURL: URL { root.appendingPathComponent("Damaged", isDirectory: true) }
        public var photosURL: URL { root.appendingPathComponent("Photos", isDirectory: true) }

        public init(root: URL) { self.root = root }

        /// The production location: `<Application Support>/KitchenBuddy/`.
        public static func applicationSupport() throws -> Layout {
            let base = try FileManager.default.url(
                for: .applicationSupportDirectory, in: .userDomainMask,
                appropriateFor: nil, create: true)
            return Layout(root: base.appendingPathComponent("KitchenBuddy", isDirectory: true))
        }

        /// A throwaway layout under the temporary directory (previews,
        /// in-memory books that still need somewhere to put snapshots).
        public static func temporary() -> Layout {
            Layout(root: FileManager.default.temporaryDirectory
                .appendingPathComponent("KitchenBuddy-\(UUID().uuidString)", isDirectory: true))
        }
    }

    /// Opens (creating if needed) the database at `layout.databaseURL` and
    /// applies pending migrations. `RecipeBook.open` adds the integrity
    /// check and pre-migration snapshot around this.
    public static func open(_ layout: Layout) throws -> DatabasePool {
        try prepareDirectories(layout)
        let pool = try openWithoutMigrating(layout)
        try migrator.migrate(pool)
        return pool
    }

    /// Opens the file exactly as it is, migrations pending.
    static func openWithoutMigrating(_ layout: Layout) throws -> DatabasePool {
        try DatabasePool(path: layout.databaseURL.path, configuration: configuration())
    }

    /// An in-memory database with the same migrations, for tests.
    public static func openInMemory() throws -> DatabaseQueue {
        let queue = try DatabaseQueue(configuration: configuration())
        try migrator.migrate(queue)
        return queue
    }

    static func configuration() -> Configuration {
        var config = Configuration()
        config.foreignKeysEnabled = true
        config.busyMode = .timeout(5)
        config.prepareDatabase { db in
            try db.execute(sql: "PRAGMA synchronous = FULL")
        }
        return config
    }

    /// Migrations only ever add (tables, columns, indexes, triggers) or
    /// backfill. Never drop or rename a user-content table.
    static var migrator: DatabaseMigrator {
        var migrator = DatabaseMigrator()
        migrator.eraseDatabaseOnSchemaChange = false
        Migrations.registerAll(in: &migrator)
        return migrator
    }

    /// Creates the data directories, includes them in device backups, and
    /// (on iOS) lets background snapshots read them while the device is
    /// locked.
    static func prepareDirectories(_ layout: Layout) throws {
        for url in [layout.root, layout.backupsURL, layout.damagedURL, layout.photosURL] {
            try prepareDirectory(url)
        }
    }

    static func prepareDirectory(_ url: URL) throws {
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = false
        var mutable = url
        try mutable.setResourceValues(values)
        #if os(iOS)
        try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
        #endif
    }
}
