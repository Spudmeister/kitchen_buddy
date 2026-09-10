import Foundation
import GRDB
import KitchenCore

/// Builds `.kbrecipes` documents: one recipe, a folder subtree, or the
/// whole book, with or without history and photos.
///
/// Requirements: kitchen-buddy-ios 13.1, 13.3–13.5
public struct ExportOptions: Hashable, Sendable {
    public enum Scope: Hashable, Sendable {
        case recipe(Recipe.ID)
        case folder(Folder.ID)
        case all
    }

    public var scope: Scope
    /// Embed JPEG bytes (base64) for the recipes' photos.
    public var includePhotos: Bool
    /// Past versions, rating history, and notes. Off for a plain share.
    public var includeHistory: Bool

    public init(scope: Scope, includePhotos: Bool = true, includeHistory: Bool = true) {
        self.scope = scope
        self.includePhotos = includePhotos
        self.includeHistory = includeHistory
    }

    /// Sharing preset: current version, no notes/ratings/history.
    public static func share(_ scope: Scope, includePhotos: Bool) -> ExportOptions {
        ExportOptions(scope: scope, includePhotos: includePhotos, includeHistory: false)
    }

    /// Backup preset: everything.
    public static let fullBackup = ExportOptions(scope: .all, includePhotos: true, includeHistory: true)
}

public final class Exporter: Sendable {
    let handle: DatabaseHandle
    let photos: PhotoStore
    let clock: Clock
    let appBuild: String

    init(handle: DatabaseHandle, photos: PhotoStore, clock: Clock, appBuild: String) {
        self.handle = handle
        self.photos = photos
        self.clock = clock
        self.appBuild = appBuild
    }

    public func export(_ options: ExportOptions) throws -> ExportDocumentV2 {
        try handle.writer.read { db in
            let (recipeIDs, folders) = try Self.selection(options.scope, db)
            let records = try recipeIDs.map { id in try self.record(id, options: options, db) }
            // Book-wide mappings travel with the backup preset only (they are personal).
            let mappings = options.includeHistory ? try RecipeSQL.foodMappings(db).map(ExportDocumentV2.FoodMappingRecord.init) : nil
            return ExportDocumentV2(exportedAt: clock.now(), appBuild: appBuild,
                                    folders: folders.map(ExportDocumentV2.FolderRecord.init),
                                    recipes: records, foodMappings: mappings)
        }
    }

    /// Encoded JSON, ready for a `.kbrecipes` file.
    public func exportData(_ options: ExportOptions) throws -> Data {
        try export(options).encoded()
    }

    /// Recipe ids and folder rows for the scope. A folder scope takes the
    /// non-archived recipes of the subtree; a full backup takes everything,
    /// archived recipes and soft-deleted folders included.
    static func selection(_ scope: ExportOptions.Scope, _ db: Database) throws -> ([Recipe.ID], [Folder]) {
        switch scope {
        case .recipe(let id):
            return ([id], [])
        case .folder(let folderID):
            let subtree = try FolderStore.subtreeIDs(of: folderID, db)
            let placeholders = Array(repeating: "?", count: subtree.count).joined(separator: ", ")
            let ids = try String.fetchAll(db, sql: """
                SELECT id FROM recipes WHERE folder_id IN (\(placeholders)) AND archived_at IS NULL ORDER BY created_at, id
                """, arguments: StatementArguments(subtree.map(\.rawValue))).map(Recipe.ID.init(rawValue:))
            let folders = try Row.fetchAll(db, sql: "SELECT * FROM folders WHERE id IN (\(placeholders))",
                                           arguments: StatementArguments(subtree.map(\.rawValue))).map(FolderStore.folder(from:))
            return (ids, folders)
        case .all:
            let ids = try String.fetchAll(db, sql: "SELECT id FROM recipes ORDER BY created_at, id").map(Recipe.ID.init(rawValue:))
            let folders = try Row.fetchAll(db, sql: "SELECT * FROM folders ORDER BY created_at, id").map(FolderStore.folder(from:))
            return (ids, folders)
        }
    }

    func record(_ id: Recipe.ID, options: ExportOptions, _ db: Database) throws -> ExportDocumentV2.RecipeRecord {
        let recipe = try RecipeSQL.requireRecipe(id, db)
        let allVersions = try RecipeSQL.versions(id, db).reversed()
        let versions = options.includeHistory ? Array(allVersions) : allVersions.filter { $0.version == recipe.currentVersion }
        let ratings = options.includeHistory ? try RecipeSQL.ratings(id, db) : []
        let clears = options.includeHistory ? try RecipeSQL.ratingEvents(id, db).compactMap { event -> ExportDocumentV2.ClearRecord? in
            if case .cleared(let clearID, _, let date) = event { return ExportDocumentV2.ClearRecord(id: clearID.rawValue, clearedAt: date) }
            return nil
        } : []
        let notes = options.includeHistory ? try RecipeSQL.notes(id, includeDeleted: true, db) : []
        let reports = options.includeHistory ? try RecipeSQL.servingReports(id, db) : []
        let overrides = options.includeHistory ? try RecipeSQL.foodOverrides(id, db) : []
        let photoRows = try RecipeSQL.photos(id, db)
        let photoRecords = try photoRows.map { photo -> ExportDocumentV2.PhotoRecord in
            let data: Data? = options.includePhotos ? (try? Data(contentsOf: photos.url(for: photo))) : nil
            return ExportDocumentV2.PhotoRecord(photo, data: data)
        }
        let folderID: Folder.ID?
        if case .recipe = options.scope { folderID = nil } else { folderID = recipe.folderID }
        return ExportDocumentV2.RecipeRecord(
            id: id, currentVersion: recipe.currentVersion, folderId: folderID,
            parentRecipeId: recipe.parentRecipeID, archivedAt: recipe.archivedAt,
            createdAt: recipe.createdAt, updatedAt: recipe.updatedAt,
            tags: try RecipeSQL.tags(id, db),
            versions: versions.map(ExportDocumentV2.VersionRecord.init),
            ratings: ratings.map(ExportDocumentV2.RatingRecord.init),
            ratingClears: clears,
            notes: notes.map(ExportDocumentV2.NoteRecord.init),
            photos: photoRecords,
            servingReports: reports.map(ExportDocumentV2.ServingReportRecord.init),
            foodOverrides: overrides.map(ExportDocumentV2.FoodOverrideRecord.init))
    }
}
