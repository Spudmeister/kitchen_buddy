import Foundation
import GRDB
import KitchenCore

/// Maintains `recipe_search` (the denormalized browse/sort projection, one
/// row per recipe) and answers Library queries through `recipes_fts`.
/// `refresh` runs inside every write transaction that touches a recipe;
/// `rebuildAll` recomputes every row and rebuilds the FTS index and is safe
/// to run at any time.
///
/// Requirements: kitchen-buddy-ios 6.1–6.3, 6.5, 15.4, 18.4
public enum SearchIndex {
    /// Bumped whenever the projection's derivation changes; a stale stored
    /// value triggers `rebuildAll` at open.
    public static let currentVersion = 1

    public static let resultLimit = 500

    /// bm25 weights per FTS column: title, description, ingredients, steps, tags.
    static let ranking = "bm25(recipes_fts, 10, 3, 5, 1, 6)"

    // MARK: Maintenance

    static func refresh(_ recipeID: Recipe.ID, _ db: Database) throws {
        // The health projection rides on the same hook so every existing
        // write path keeps both derived tables current (Requirement 21.9).
        try HealthIndex.refresh(recipeID, db)
        guard let row = try Row.fetchOne(db, sql: """
            SELECT r.folder_id, r.archived_at, r.created_at, r.updated_at,
                   v.id AS version_id, v.title, v.description, v.prep_minutes, v.cook_minutes
            FROM recipes r
            JOIN recipe_versions v ON v.recipe_id = r.id AND v.version = r.current_version
            WHERE r.id = ?
            """, arguments: [recipeID.rawValue]) else { return }

        let versionID: String = row["version_id"]
        let ingredients = try String.fetchAll(db, sql: """
            SELECT name FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order
            """, arguments: [versionID])
        let instructions = try String.fetchAll(db, sql: """
            SELECT text FROM instructions WHERE recipe_version_id = ? ORDER BY step_number
            """, arguments: [versionID])
        let tags = try String.fetchAll(db, sql: """
            SELECT t.name FROM tags t JOIN recipe_tags rt ON rt.tag_id = t.id
            WHERE rt.recipe_id = ? ORDER BY t.name COLLATE NOCASE
            """, arguments: [recipeID.rawValue])
        let latestRating = try RecipeSQL.latestRating(recipeID, db)?.value
        let thumbnail = try String.fetchOne(db, sql: """
            SELECT id FROM photos WHERE recipe_id = ? AND removed_at IS NULL ORDER BY sort_order, created_at LIMIT 1
            """, arguments: [recipeID.rawValue])

        let title: String = row["title"]
        let prep: Int? = row["prep_minutes"]
        let cook: Int? = row["cook_minutes"]
        let total: Int? = (prep == nil && cook == nil) ? nil : (prep ?? 0) + (cook ?? 0)

        try db.execute(sql: """
            INSERT INTO recipe_search (recipe_id, title, title_sort, description, ingredients_text,
                instructions_text, tags_text, folder_id, archived_at, latest_rating, total_minutes,
                thumbnail_photo_id, created_at, updated_at)
            VALUES (:recipe_id, :title, :title_sort, :description, :ingredients_text,
                :instructions_text, :tags_text, :folder_id, :archived_at, :latest_rating, :total_minutes,
                :thumbnail_photo_id, :created_at, :updated_at)
            ON CONFLICT(recipe_id) DO UPDATE SET
                title = excluded.title, title_sort = excluded.title_sort, description = excluded.description,
                ingredients_text = excluded.ingredients_text, instructions_text = excluded.instructions_text,
                tags_text = excluded.tags_text, folder_id = excluded.folder_id, archived_at = excluded.archived_at,
                latest_rating = excluded.latest_rating, total_minutes = excluded.total_minutes,
                thumbnail_photo_id = excluded.thumbnail_photo_id, created_at = excluded.created_at,
                updated_at = excluded.updated_at
            """, arguments: [
                "recipe_id": recipeID.rawValue,
                "title": title,
                "title_sort": sortKey(title),
                "description": row["description"] as String?,
                "ingredients_text": ingredients.joined(separator: "\n"),
                "instructions_text": instructions.joined(separator: "\n"),
                "tags_text": tags.joined(separator: "\n"),
                "folder_id": row["folder_id"] as String?,
                "archived_at": row["archived_at"] as String?,
                "latest_rating": latestRating,
                "total_minutes": total,
                "thumbnail_photo_id": thumbnail,
                "created_at": row["created_at"] as String,
                "updated_at": row["updated_at"] as String,
            ])
    }

    /// Recomputes every projection row in place (rowids are preserved, so
    /// the FTS content mapping stays valid) and rebuilds the FTS index.
    static func rebuildAll(_ db: Database) throws {
        let ids = try String.fetchAll(db, sql: "SELECT id FROM recipes ORDER BY created_at, id")
        for id in ids { try refresh(Recipe.ID(id), db) }
        try db.execute(sql: "INSERT INTO recipes_fts(recipes_fts) VALUES ('rebuild')")
        try PreferencesStore.setValue(String(currentVersion), forKey: PreferencesStore.searchIndexVersionKey, db)
        try HealthIndex.markCurrent(db)
    }

    /// True when either derived table's stored version is older than this
    /// build's (food table, thresholds or derivation changed).
    static func isStale(_ db: Database) throws -> Bool {
        let stored = try PreferencesStore.value(forKey: PreferencesStore.searchIndexVersionKey, db).flatMap(Int.init)
        if stored != currentVersion { return true }
        return try HealthIndex.isStale(db)
    }

    /// Case- and diacritic-folded key for ordering by name.
    static func sortKey(_ title: String) -> String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive], locale: nil)
    }

    // MARK: Queries

    /// Runs a Library query. With text, results are ranked by bm25 relevance;
    /// without, by the query's sort. Every filter is ANDed. Archived recipes
    /// appear only when the query asks for them.
    static func summaries(_ query: RecipeQuery, _ db: Database) throws -> [RecipeSummary] {
        var sql: String
        var arguments: [DatabaseValueConvertible?] = []
        let pattern = FTS5Pattern(matchingAllPrefixesIn: query.text)

        if let pattern {
            sql = """
                SELECT rs.* FROM recipes_fts
                JOIN recipe_search rs ON rs.rowid = recipes_fts.rowid
                WHERE recipes_fts MATCH ?
                """
            arguments.append(pattern)
        } else {
            sql = "SELECT rs.* FROM recipe_search rs WHERE 1"
        }
        for profile in query.friendlyProfiles.sorted(by: { $0.rawValue < $1.rawValue }) {
            sql += " AND EXISTS (SELECT 1 FROM recipe_health rh WHERE rh.recipe_id = rs.recipe_id AND rh.\(HealthIndex.bandColumn(profile)) = 0)"
        }

        if !query.includeArchived { sql += " AND rs.archived_at IS NULL" }
        if let minimum = query.minimumRating {
            sql += " AND rs.latest_rating >= ?"
            arguments.append(minimum)
        }
        if let maximum = query.maximumTotalMinutes {
            sql += " AND rs.total_minutes IS NOT NULL AND rs.total_minutes <= ?"
            arguments.append(maximum)
        }
        if let folderID = query.folderID {
            let scope = try FolderStore.subtreeIDs(of: folderID, db)
            let placeholders = Array(repeating: "?", count: scope.count).joined(separator: ", ")
            sql += " AND rs.folder_id IN (\(placeholders))"
            arguments.append(contentsOf: scope.map { $0.rawValue })
        }
        for tag in TagName.normalize(query.tags) {
            sql += """
                 AND EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
                             WHERE rt.recipe_id = rs.recipe_id AND t.name = ? COLLATE NOCASE)
                """
            arguments.append(tag)
        }

        if pattern != nil {
            sql += " ORDER BY \(ranking), rs.title_sort, rs.recipe_id"
        } else {
            sql += " ORDER BY \(orderClause(query)), rs.title_sort ASC, rs.recipe_id ASC"
        }
        sql += " LIMIT \(resultLimit)"

        // Health rides in a second lookup over the returned page only: a
        // join over every candidate row cost ~6 ms at 5,000 recipes.
        let summaries = try Row.fetchAll(db, sql: sql, arguments: StatementArguments(arguments)).map(summary(from:))
        return try HealthIndex.attach(to: summaries, db)
    }

    static func orderClause(_ query: RecipeQuery) -> String {
        let direction = query.direction == .ascending ? "ASC" : "DESC"
        switch query.sort {
        case .name: return "rs.title_sort \(direction)"
        case .rating: return "rs.latest_rating IS NULL, rs.latest_rating \(direction)"
        case .dateAdded: return "rs.created_at \(direction)"
        case .dateUpdated: return "rs.updated_at \(direction)"
        case .totalTime: return "rs.total_minutes IS NULL, rs.total_minutes \(direction)"
        }
    }

    static func summary(_ recipeID: Recipe.ID, _ db: Database) throws -> RecipeSummary? {
        guard let summary = try Row.fetchOne(db, sql: "SELECT * FROM recipe_search WHERE recipe_id = ?",
                                             arguments: [recipeID.rawValue]).map(summary(from:)) else { return nil }
        return try HealthIndex.attach(to: [summary], db).first
    }

    static func summary(from row: Row) -> RecipeSummary {
        let tagsText: String = row["tags_text"]
        return RecipeSummary(
            id: row.id("recipe_id"),
            title: row["title"],
            description: row["description"],
            folderID: row.optionalID("folder_id"),
            archivedAt: row.optionalTimestamp("archived_at"),
            latestRating: row["latest_rating"],
            totalMinutes: row["total_minutes"],
            thumbnailPhotoID: row.optionalID("thumbnail_photo_id"),
            tags: tagsText.isEmpty ? [] : tagsText.components(separatedBy: "\n"),
            createdAt: row.timestamp("created_at"),
            updatedAt: row.timestamp("updated_at")
        )
    }
}
