import Foundation
import GRDB
import KitchenCore

/// The composition root of persistence: opens the database with the
/// data-safety settings, applies migrations, rebuilds a stale search index,
/// and hands out the stores. The app and tests create one of these; nothing
/// outside `KitchenPersistence` ever sees GRDB.
///
/// Requirements: kitchen-buddy-ios 1.6, 17.8, 18.4
public final class RecipeBook: Sendable {
    public let recipes: RecipeStore
    public let folders: FolderStore
    public let tags: TagStore
    public let preferences: PreferencesStore
    let writer: any DatabaseWriter

    init(writer: any DatabaseWriter, clock: Clock) throws {
        self.writer = writer
        recipes = RecipeStore(writer: writer, clock: clock)
        folders = FolderStore(writer: writer, clock: clock)
        tags = TagStore(writer: writer, clock: clock)
        preferences = PreferencesStore(writer: writer)
        try writer.write { db in
            if try SearchIndex.isStale(db) { try SearchIndex.rebuildAll(db) }
        }
    }

    /// Opens (creating if needed) the on-disk database in `layout`.
    public static func open(_ layout: DatabaseStack.Layout, clock: Clock = .system) throws -> RecipeBook {
        try RecipeBook(writer: try DatabaseStack.open(layout), clock: clock)
    }

    /// A private in-memory database, for tests and previews.
    public static func openInMemory(clock: Clock = .system) throws -> RecipeBook {
        try RecipeBook(writer: try DatabaseStack.openInMemory(), clock: clock)
    }

    /// Closes the connection; the book must not be used afterwards.
    public func close() throws {
        try writer.close()
    }

    /// Settings › Rebuild search index.
    public func rebuildSearchIndex() throws {
        try writer.write { db in try SearchIndex.rebuildAll(db) }
    }

    /// Imports every recipe of a v1-era JSON document in one transaction
    /// (all or nothing), through the same path the editor uses. Powers the
    /// demo seed and "Load sample recipes"; M8's `Importer` adds review,
    /// skip/copy, and the pre-import snapshot on top.
    ///
    /// Requirements: kitchen-buddy-ios 14.1, 14.4
    @discardableResult
    public func importLegacyV1(_ data: Data, into folderID: Folder.ID? = nil) throws -> [RecipeDetail] {
        try importDrafts(try LegacyV1Reader.read(data), into: folderID)
    }

    /// Creates every draft in one transaction: all succeed or none is stored.
    @discardableResult
    public func importDrafts(_ drafts: [RecipeDraft], into folderID: Folder.ID? = nil) throws -> [RecipeDetail] {
        try writer.write { db in
            try drafts.map { draft in
                var draft = draft
                if folderID != nil { draft.folderID = folderID }
                return try recipes.create(draft, parent: nil, db)
            }
        }
    }
}
