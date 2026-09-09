import Foundation
import GRDB
import KitchenCore

/// Imports `.kbrecipes` / v1 files: preview counts and clashes, then one
/// transaction after a pre-import snapshot. Existing recipes are skipped or
/// copied under new ids; a parent that is not present is cleared (4.5).
///
/// Requirements: kitchen-buddy-ios 14.1–14.5, 17.2
public struct ImportPreview: Hashable, Sendable {
    public struct Entry: Hashable, Sendable, Identifiable {
        public let id: Recipe.ID
        public let title: String
        public let exists: Bool
    }
    public var source: ImportDocument.Source
    public var entries: [Entry]
    public var folderCount: Int
    public var photoCount: Int
    public var versionCount: Int
    public var noteCount: Int
    public var existingCount: Int { entries.filter(\.exists).count }
    public var recipeCount: Int { entries.count }
}

public enum ImportPolicy: String, Hashable, Sendable, CaseIterable {
    case skipExisting
    case copyAsNew
}

public struct ImportSummary: Hashable, Sendable {
    public var imported: Int
    public var skipped: Int
    public var foldersCreated: Int
    public var photosWritten: Int
    public var importedIDs: [Recipe.ID]
}

public final class Importer: Sendable {
    let handle: DatabaseHandle
    let photos: PhotoStore
    let backups: BackupManager
    let clock: Clock
    let isPersistent: Bool

    init(handle: DatabaseHandle, photos: PhotoStore, backups: BackupManager, clock: Clock, isPersistent: Bool) {
        self.handle = handle
        self.photos = photos
        self.backups = backups
        self.clock = clock
        self.isPersistent = isPersistent
    }

    public func preview(_ reading: ImportDocument.Reading) throws -> ImportPreview {
        let document = reading.document
        return try handle.writer.read { db in
            let entries = try document.recipes.map { record in
                let exists = try Bool.fetchOne(db, sql: "SELECT EXISTS (SELECT 1 FROM recipes WHERE id = ?)", arguments: [record.id.rawValue]) ?? false
                let title = record.versions.first { $0.version == record.currentVersion }?.title ?? record.versions.last?.title ?? "Untitled"
                return ImportPreview.Entry(id: record.id, title: title, exists: exists)
            }
            return ImportPreview(source: reading.source, entries: entries,
                                 folderCount: document.folders.count,
                                 photoCount: document.recipes.reduce(0) { $0 + $1.photos.filter { $0.data != nil }.count },
                                 versionCount: document.recipes.reduce(0) { $0 + $1.versions.count },
                                 noteCount: document.recipes.reduce(0) { $0 + $1.notes.count })
        }
    }

    /// Snapshot first, then everything in one transaction: any error rolls
    /// the database back and leaves no half-imported recipe (14.4).
    @discardableResult
    public func perform(_ reading: ImportDocument.Reading, policy: ImportPolicy, destinationFolder: Folder.ID? = nil) throws -> ImportSummary {
        if isPersistent { try backups.snapshot(reason: .preImport) }
        let document = reading.document
        var writtenFiles: [URL] = []
        do {
            let summary = try handle.writer.write { db -> ImportSummary in
                let now = clock.now()
                var summary = ImportSummary(imported: 0, skipped: 0, foldersCreated: 0, photosWritten: 0, importedIDs: [])

                // Folders: by id, parents first; missing parents become top level.
                let known = Set(document.folders.map(\.id))
                var folderMap: [Folder.ID: Folder.ID] = [:]
                for record in Self.parentsFirst(document.folders) {
                    if try FolderStore.folder(record.id, db) != nil {
                        folderMap[record.id] = record.id
                        continue
                    }
                    let parent = record.parentId.flatMap { known.contains($0) ? folderMap[$0] : nil }
                    try db.execute(sql: """
                        INSERT INTO folders (id, name, parent_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)
                        """, arguments: [record.id.rawValue, record.name, parent?.rawValue,
                                         Timestamp.normalize(record.createdAt).sql, Timestamp.normalize(record.updatedAt).sql,
                                         record.deletedAt.map(Timestamp.normalize).sql])
                    folderMap[record.id] = record.id
                    summary.foldersCreated += 1
                }

                // Recipe id mapping: skipped recipes keep their id (they exist),
                // copies get fresh ids, new ones keep theirs.
                var recipeMap: [Recipe.ID: Recipe.ID] = [:]
                var toInsert: [ExportDocumentV2.RecipeRecord] = []
                for record in document.recipes {
                    let exists = try Bool.fetchOne(db, sql: "SELECT EXISTS (SELECT 1 FROM recipes WHERE id = ?)", arguments: [record.id.rawValue]) ?? false
                    switch (exists, policy) {
                    case (true, .skipExisting):
                        recipeMap[record.id] = record.id
                        summary.skipped += 1
                    case (true, .copyAsNew), (false, .copyAsNew):
                        recipeMap[record.id] = Recipe.ID()
                        toInsert.append(record)
                    case (false, .skipExisting):
                        recipeMap[record.id] = record.id
                        toInsert.append(record)
                    }
                }

                for record in toInsert {
                    let newID = recipeMap[record.id]!
                    let parent: Recipe.ID? = try record.parentRecipeId.flatMap { original in
                        if let mapped = recipeMap[original], mapped != newID { return mapped }
                        let present = try Bool.fetchOne(db, sql: "SELECT EXISTS (SELECT 1 FROM recipes WHERE id = ?)", arguments: [original.rawValue]) ?? false
                        return present ? original : nil
                    }
                    let folder = record.folderId.flatMap { folderMap[$0] } ?? destinationFolder
                    if let folder { try FolderStore.requireLive(folder, db) }
                    try db.execute(sql: """
                        INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, archived_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, arguments: [newID.rawValue, record.currentVersion, folder?.rawValue, parent?.rawValue,
                                         record.archivedAt.map(Timestamp.normalize).sql,
                                         Timestamp.normalize(record.createdAt).sql, Timestamp.normalize(record.updatedAt).sql])
                    let versions = record.versions.sorted { $0.version < $1.version }
                    guard versions.contains(where: { $0.version == record.currentVersion }) else {
                        throw ImportDocument.Problem.malformed("recipe \(record.id) has no version \(record.currentVersion)")
                    }
                    for version in versions {
                        let versionID = policy == .copyAsNew ? RecipeVersion.ID() : version.id
                        try db.execute(sql: """
                            INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_minutes, cook_minutes,
                                servings, source_url, restored_from_version, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, arguments: [versionID.rawValue, newID.rawValue, version.version, version.title, version.description,
                                             version.prepMinutes, version.cookMinutes, version.servings, version.sourceUrl,
                                             version.restoredFromVersion, Timestamp.normalize(version.createdAt).sql])
                        for (index, ingredient) in version.ingredients.enumerated() {
                            let draft = ingredient.draft
                            try db.execute(sql: """
                                INSERT INTO ingredients (id, recipe_version_id, sort_order, name, quantity_num, quantity_den, unit, notes, category)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, arguments: [policy == .copyAsNew ? Ingredient.ID().rawValue : ingredient.id.rawValue, versionID.rawValue, index,
                                                 draft.name, draft.quantity?.numerator, draft.quantity?.denominator,
                                                 draft.unit?.rawValue, draft.notes, draft.category?.rawValue])
                        }
                        for (index, instruction) in version.instructions.sorted(by: { $0.step < $1.step }).enumerated() {
                            try db.execute(sql: """
                                INSERT INTO instructions (id, recipe_version_id, step_number, text, duration_minutes, notes)
                                VALUES (?, ?, ?, ?, ?, ?)
                                """, arguments: [policy == .copyAsNew ? Instruction.ID().rawValue : instruction.id.rawValue, versionID.rawValue,
                                                 index + 1, instruction.text, instruction.durationMinutes, instruction.notes])
                        }
                    }
                    try RecipeSQL.setTags(record.tags, for: newID, now: now, db)
                    for rating in record.ratings {
                        try db.execute(sql: "INSERT INTO ratings (id, recipe_id, value, rated_at) VALUES (?, ?, ?, ?)",
                                       arguments: [policy == .copyAsNew ? Rating.ID().rawValue : rating.id.rawValue, newID.rawValue,
                                                   rating.value, Timestamp.normalize(rating.ratedAt).sql])
                    }
                    for clear in record.ratingClears {
                        try db.execute(sql: "INSERT INTO rating_clears (id, recipe_id, cleared_at) VALUES (?, ?, ?)",
                                       arguments: [policy == .copyAsNew ? Tagged<RatingEvent>().rawValue : clear.id, newID.rawValue,
                                                   Timestamp.normalize(clear.clearedAt).sql])
                    }
                    for note in record.notes {
                        try db.execute(sql: """
                            INSERT INTO recipe_notes (id, recipe_id, body, cooked_on, pinned, version_at_creation, created_at, updated_at, deleted_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, arguments: [policy == .copyAsNew ? RecipeNote.ID().rawValue : note.id.rawValue, newID.rawValue, note.body,
                                             note.cookedOn.map(Timestamp.normalize).sql, note.pinned, note.versionAtCreation,
                                             Timestamp.normalize(note.createdAt).sql, Timestamp.normalize(note.updatedAt).sql,
                                             note.deletedAt.map(Timestamp.normalize).sql])
                    }
                    for report in record.servingReports {
                        guard report.servings.map({ (1...999).contains($0) }) ?? true else { continue }
                        try db.execute(sql: "INSERT INTO serving_reports (id, recipe_id, servings, note, reported_at) VALUES (?, ?, ?, ?, ?)",
                                       arguments: [policy == .copyAsNew ? ServingReport.ID().rawValue : report.id.rawValue, newID.rawValue,
                                                   report.servings, report.note, Timestamp.normalize(report.reportedAt).sql])
                    }
                    for override in record.foodOverrides {
                        // Unknown food ids (a newer table) import as "automatic" so nothing is silently miscounted.
                        let foodID = override.foodId.map { FoodTable.food(id: $0) == nil && $0 != FoodOverride.automaticMarker ? FoodOverride.automaticMarker : $0 }
                        try db.execute(sql: "INSERT INTO food_overrides (id, recipe_id, ingredient_key, food_id, created_at) VALUES (?, ?, ?, ?, ?)",
                                       arguments: [policy == .copyAsNew ? FoodOverride.ID().rawValue : override.id.rawValue, newID.rawValue,
                                                   override.ingredientKey, foodID, Timestamp.normalize(override.createdAt).sql])
                    }
                    for photo in record.photos.sorted(by: { $0.sortOrder < $1.sortOrder }) where photo.removedAt == nil {
                        guard let data = photo.data else { continue }
                        let photoID = policy == .copyAsNew ? Photo.ID() : photo.id
                        let fileName = "\(photoID.rawValue).jpg"
                        let decoded = try PhotoStore.decode(data)
                        try DatabaseStack.prepareDirectory(photos.layout.photosURL)
                        let fullURL = photos.layout.photosURL.appendingPathComponent(fileName)
                        let thumbURL = photos.layout.photosURL.appendingPathComponent(PhotoStore.thumbnailName(fileName))
                        try PhotoStore.writeJPEG(decoded.image, to: fullURL, quality: 0.9)
                        try PhotoStore.writeJPEG(decoded.thumbnail, to: thumbURL, quality: 0.8)
                        writtenFiles += [fullURL, thumbURL]
                        try db.execute(sql: """
                            INSERT INTO photos (id, recipe_id, file_name, width, height, taken_at, caption, sort_order, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, arguments: [photoID.rawValue, newID.rawValue, fileName, decoded.image.width, decoded.image.height,
                                             photo.takenAt.map(Timestamp.normalize).sql, photo.caption, photo.sortOrder,
                                             Timestamp.normalize(photo.createdAt).sql])
                        summary.photosWritten += 1
                    }
                    try SearchIndex.refresh(newID, db)
                    summary.imported += 1
                    summary.importedIDs.append(newID)
                }
                return summary
            }
            return summary
        } catch {
            // The transaction rolled back; photo files written for it are orphans.
            for url in writtenFiles { try? FileManager.default.removeItem(at: url) }
            throw error
        }
    }

    static func parentsFirst(_ folders: [ExportDocumentV2.FolderRecord]) -> [ExportDocumentV2.FolderRecord] {
        var ordered: [ExportDocumentV2.FolderRecord] = []
        var remaining = folders
        var placed = Set<Folder.ID>()
        var guardCount = 0
        while !remaining.isEmpty && guardCount < folders.count + 1 {
            let ready = remaining.filter { record in
                guard let parent = record.parentId else { return true }
                return placed.contains(parent) || !folders.contains { $0.id == parent }
            }
            if ready.isEmpty { ordered += remaining; break }
            ordered += ready
            placed.formUnion(ready.map(\.id))
            remaining.removeAll { record in ready.contains { $0.id == record.id } }
            guardCount += 1
        }
        return ordered
    }
}
