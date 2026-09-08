import Foundation
import GRDB
import KitchenCore

/// Nested folders with soft delete. Cycle checks run inside the write
/// transaction so a concurrent move cannot slip past them.
///
/// Requirements: kitchen-buddy-ios 16.1–16.6
public final class FolderStore: FolderStoring {
    let writer: any DatabaseWriter
    let clock: Clock

    init(writer: any DatabaseWriter, clock: Clock) {
        self.writer = writer
        self.clock = clock
    }

    public func create(name: String, parentID: Folder.ID?) throws -> Folder {
        guard let name = cleaned(name) else { throw StoreError.emptyFolderName }
        return try writer.write { db in
            if let parentID { try Self.requireLive(parentID, db) }
            let now = clock.now()
            let folder = Folder(name: name, parentID: parentID, createdAt: now, updatedAt: now)
            try db.execute(sql: """
                INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
                """, arguments: [folder.id.rawValue, name, parentID?.rawValue, now.sql, now.sql])
            return folder
        }
    }

    public func rename(_ id: Folder.ID, to name: String) throws -> Folder {
        guard let name = cleaned(name) else { throw StoreError.emptyFolderName }
        return try writer.write { db in
            try Self.requireLive(id, db)
            try db.execute(sql: "UPDATE folders SET name = ?, updated_at = ? WHERE id = ?",
                           arguments: [name, clock.now().sql, id.rawValue])
            return try Self.require(id, db)
        }
    }

    public func move(_ id: Folder.ID, toParent parentID: Folder.ID?) throws -> Folder {
        try writer.write { db in
            try Self.requireLive(id, db)
            if let parentID {
                try Self.requireLive(parentID, db)
                if try Self.subtreeIDs(of: id, db).contains(parentID) { throw StoreError.folderCycle }
            }
            try db.execute(sql: "UPDATE folders SET parent_id = ?, updated_at = ? WHERE id = ?",
                           arguments: [parentID?.rawValue, clock.now().sql, id.rawValue])
            return try Self.require(id, db)
        }
    }

    public func delete(_ id: Folder.ID) throws {
        try writer.write { db in
            let folder = try Self.require(id, db)
            guard folder.deletedAt == nil else { return }
            let now = clock.now()
            let parent = folder.parentID?.rawValue
            let movedRecipes = try String.fetchAll(db, sql: "SELECT id FROM recipes WHERE folder_id = ?",
                                                   arguments: [id.rawValue])
            try db.execute(sql: "UPDATE recipes SET folder_id = ?, updated_at = ? WHERE folder_id = ?",
                           arguments: [parent, now.sql, id.rawValue])
            try db.execute(sql: "UPDATE folders SET parent_id = ?, updated_at = ? WHERE parent_id = ? AND deleted_at IS NULL",
                           arguments: [parent, now.sql, id.rawValue])
            try db.execute(sql: "UPDATE folders SET deleted_at = ?, updated_at = ? WHERE id = ?",
                           arguments: [now.sql, now.sql, id.rawValue])
            for recipeID in movedRecipes { try SearchIndex.refresh(Recipe.ID(recipeID), db) }
        }
    }

    public func all() throws -> [Folder] {
        try writer.read { db in
            try Row.fetchAll(db, sql: "SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE, id")
                .map(Self.folder(from:))
        }
    }

    public func folder(_ id: Folder.ID) throws -> Folder? {
        try writer.read { db in try Self.folder(id, db) }
    }

    public func children(of parentID: Folder.ID?) throws -> [Folder] {
        try writer.read { db in
            let sql = parentID == nil
                ? "SELECT * FROM folders WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY name COLLATE NOCASE, id"
                : "SELECT * FROM folders WHERE parent_id = ? AND deleted_at IS NULL ORDER BY name COLLATE NOCASE, id"
            let arguments: StatementArguments = parentID.map { [$0.rawValue] } ?? []
            return try Row.fetchAll(db, sql: sql, arguments: arguments).map(Self.folder(from:))
        }
    }

    public func subtree(of id: Folder.ID) throws -> [Folder.ID] {
        try writer.read { db in try Self.subtreeIDs(of: id, db) }
    }

    public func recipeCounts() throws -> [Folder.ID: Int] {
        try writer.read { db in
            let folders = try Row.fetchAll(db, sql: "SELECT id, parent_id FROM folders WHERE deleted_at IS NULL")
            var parents: [Folder.ID: Folder.ID?] = [:]
            for row in folders { parents[row.id("id")] = row.optionalID("parent_id") }
            let direct = try Row.fetchAll(db, sql: """
                SELECT folder_id, COUNT(*) AS n FROM recipes
                WHERE folder_id IS NOT NULL AND archived_at IS NULL GROUP BY folder_id
                """)
            var counts: [Folder.ID: Int] = [:]
            for id in parents.keys { counts[id] = 0 }
            for row in direct {
                let count: Int = row["n"]
                var cursor: Folder.ID? = row.id("folder_id")
                var visited: Set<Folder.ID> = []
                while let folderID = cursor, parents[folderID] != nil, visited.insert(folderID).inserted {
                    counts[folderID, default: 0] += count
                    cursor = parents[folderID] ?? nil
                }
            }
            return counts
        }
    }

    // MARK: Shared helpers

    static func folder(from row: Row) -> Folder {
        Folder(id: row.id("id"), name: row["name"], parentID: row.optionalID("parent_id"),
               createdAt: row.timestamp("created_at"), updatedAt: row.timestamp("updated_at"),
               deletedAt: row.optionalTimestamp("deleted_at"))
    }

    static func folder(_ id: Folder.ID, _ db: Database) throws -> Folder? {
        try Row.fetchOne(db, sql: "SELECT * FROM folders WHERE id = ?", arguments: [id.rawValue]).map(folder(from:))
    }

    static func require(_ id: Folder.ID, _ db: Database) throws -> Folder {
        guard let folder = try folder(id, db) else { throw StoreError.folderNotFound(id) }
        return folder
    }

    static func requireLive(_ id: Folder.ID, _ db: Database) throws {
        guard try require(id, db).deletedAt == nil else { throw StoreError.folderNotFound(id) }
    }

    /// The folder and every live descendant, breadth-first.
    static func subtreeIDs(of id: Folder.ID, _ db: Database) throws -> [Folder.ID] {
        var result: [Folder.ID] = [id]
        var frontier: [Folder.ID] = [id]
        var seen: Set<Folder.ID> = [id]
        while !frontier.isEmpty {
            let placeholders = Array(repeating: "?", count: frontier.count).joined(separator: ", ")
            let next = try String.fetchAll(db, sql: """
                SELECT id FROM folders WHERE parent_id IN (\(placeholders)) AND deleted_at IS NULL
                """, arguments: StatementArguments(frontier.map { $0.rawValue }))
                .map(Folder.ID.init(rawValue:))
                .filter { seen.insert($0).inserted }
            result.append(contentsOf: next)
            frontier = next
        }
        return result
    }

    private func cleaned(_ name: String) -> String? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
