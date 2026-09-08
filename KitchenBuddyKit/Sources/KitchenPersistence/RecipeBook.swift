import Foundation
import GRDB
import KitchenCore

/// The composition root of persistence: opens the database with the
/// data-safety settings, checks it, snapshots before migrating, applies
/// migrations, rebuilds a stale search index, and hands out the stores and
/// the backup manager. The app and tests create one of these; nothing
/// outside `KitchenPersistence` ever sees GRDB.
///
/// Requirements: kitchen-buddy-ios 1.6, 17.2, 17.5, 17.7, 17.8, 18.4
public final class RecipeBook: Sendable {
    public let layout: DatabaseStack.Layout
    public let recipes: RecipeStore
    public let folders: FolderStore
    public let tags: TagStore
    public let preferences: PreferencesStore
    public let backups: BackupManager
    public let launchReport: LaunchReport
    /// False for in-memory books, which skip the pre-import snapshot.
    public let isPersistent: Bool
    let handle: DatabaseHandle
    let clock: Clock

    var writer: any DatabaseWriter { handle.writer }

    private init(handle: DatabaseHandle, layout: DatabaseStack.Layout, clock: Clock,
                 launchReport: LaunchReport, isPersistent: Bool) throws {
        self.handle = handle
        self.layout = layout
        self.clock = clock
        self.launchReport = launchReport
        self.isPersistent = isPersistent
        recipes = RecipeStore(handle: handle, clock: clock)
        folders = FolderStore(handle: handle, clock: clock)
        tags = TagStore(handle: handle, clock: clock)
        preferences = PreferencesStore(handle: handle)
        try Self.rebuildIndexIfStale(handle.writer)
        // After housekeeping, so its change baseline excludes the rebuild.
        backups = BackupManager(layout: layout, handle: handle, clock: clock)
    }

    /// Opens (creating if needed) the on-disk database in `layout`:
    /// `quick_check` → rename-aside + restore on failure → pre-migration
    /// snapshot → migrate.
    public static func open(_ layout: DatabaseStack.Layout, clock: Clock = .system) throws -> RecipeBook {
        try DatabaseStack.prepareDirectories(layout)
        let existed = FileManager.default.fileExists(atPath: layout.databaseURL.path)
        var report = LaunchReport.healthy

        if existed && !Recovery.passesQuickCheck(layout.databaseURL) {
            let damaged = try Recovery.moveAside(layout, now: clock.now())
            let candidate = try BackupManager.newestVerified(in: layout, liveRecipeCount: nil, clock: clock)
            if let candidate {
                try FileManager.default.copyItem(at: candidate.url, to: layout.databaseURL)
                try BackupManager.fsync(layout.databaseURL)
            }
            report = .recovered(damagedFile: damaged, restoredFrom: candidate)
        }

        let pool = try DatabaseStack.openWithoutMigrating(layout)
        let handle = DatabaseHandle(pool)
        let pending = try pool.read { db in !(try DatabaseStack.migrator.hasCompletedMigrations(db)) }
        if pending {
            var preMigration: Snapshot?
            if existed {
                preMigration = try BackupManager(layout: layout, handle: handle, clock: clock).snapshot(reason: .preMigration)
            }
            try DatabaseStack.migrator.migrate(pool)
            if case .healthy = report { report = .migrated(preMigrationSnapshot: preMigration) }
        }
        return try RecipeBook(handle: handle, layout: layout, clock: clock, launchReport: report, isPersistent: true)
    }

    /// A private in-memory database, for tests and previews. Snapshots go
    /// to a throwaway temporary layout.
    public static func openInMemory(clock: Clock = .system) throws -> RecipeBook {
        let layout = DatabaseStack.Layout.temporary()
        try DatabaseStack.prepareDirectories(layout)
        return try RecipeBook(handle: DatabaseHandle(try DatabaseStack.openInMemory()), layout: layout,
                              clock: clock, launchReport: .healthy, isPersistent: false)
    }

    /// Closes the connection; the book must not be used afterwards.
    public func close() throws {
        try handle.close()
    }

    /// Settings › Rebuild search index.
    public func rebuildSearchIndex() throws {
        try writer.write { db in try SearchIndex.rebuildAll(db) }
    }

    static func rebuildIndexIfStale(_ writer: any DatabaseWriter) throws {
        try writer.write { db in
            if try SearchIndex.isStale(db) { try SearchIndex.rebuildAll(db) }
        }
    }

    /// Replaces the live database with a verified snapshot after taking a
    /// `pre-restore` snapshot. Returns that safety snapshot. Atomic: a
    /// failure leaves the live database as it was.
    ///
    /// Requirements: kitchen-buddy-ios 17.7
    @discardableResult
    public func restore(from snapshot: Snapshot) throws -> Snapshot {
        let layout = self.layout
        let preRestore = try backups.restore(snapshot) { try DatabaseStack.open(layout) }
        try Self.rebuildIndexIfStale(handle.writer)
        return preRestore
    }

    /// Imports every recipe of a v1-era JSON document in one transaction
    /// (all or nothing), through the same path the editor uses, after a
    /// `pre-import` snapshot. Powers the demo seed and "Load sample
    /// recipes"; M8's `Importer` adds review and skip/copy on top.
    ///
    /// Requirements: kitchen-buddy-ios 14.1, 14.4, 17.2
    @discardableResult
    public func importLegacyV1(_ data: Data, into folderID: Folder.ID? = nil) throws -> [RecipeDetail] {
        try importDrafts(try LegacyV1Reader.read(data), into: folderID)
    }

    /// Creates every draft in one transaction: all succeed or none is stored.
    /// Persistent books snapshot first.
    @discardableResult
    public func importDrafts(_ drafts: [RecipeDraft], into folderID: Folder.ID? = nil) throws -> [RecipeDetail] {
        if isPersistent { try backups.snapshot(reason: .preImport) }
        return try writer.write { db in
            try drafts.map { draft in
                var draft = draft
                if folderID != nil { draft.folderID = folderID }
                return try recipes.create(draft, parent: nil, db)
            }
        }
    }
}
