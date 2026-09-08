import Foundation
import GRDB
import KitchenCore

/// Tag names and their use. Tag rows are created on first use and kept
/// forever; only the recipe↔tag links change.
///
/// Requirements: kitchen-buddy-ios 5.1, 5.5
public final class TagStore: TagStoring {
    let writer: any DatabaseWriter
    let clock: Clock

    init(writer: any DatabaseWriter, clock: Clock) {
        self.writer = writer
        self.clock = clock
    }

    public func all() throws -> [TagCount] {
        try suggestions(prefix: "")
    }

    public func suggestions(prefix: String) throws -> [TagCount] {
        let prefix = TagName.normalize(prefix) ?? ""
        return try writer.read { db in
            try Row.fetchAll(db, sql: """
                SELECT t.name AS name,
                       (SELECT COUNT(*) FROM recipe_tags rt JOIN recipes r ON r.id = rt.recipe_id
                        WHERE rt.tag_id = t.id AND r.archived_at IS NULL) AS n
                FROM tags t
                WHERE t.name LIKE ? ESCAPE '\\'
                ORDER BY n DESC, t.name COLLATE NOCASE
                """, arguments: [Self.likePrefix(prefix)])
            .map { TagCount(name: $0["name"], count: $0["n"]) }
        }
    }

    public func tags(for recipeID: Recipe.ID) throws -> [String] {
        try writer.read { db in try RecipeSQL.tags(recipeID, db) }
    }

    public func add(_ tag: String, to recipeID: Recipe.ID) throws {
        guard let name = TagName.normalize(tag) else { throw StoreError.emptyTagName }
        try writer.write { db in
            try RecipeSQL.requireRecipe(recipeID, db)
            let current = try RecipeSQL.tags(recipeID, db)
            let now = clock.now()
            if try RecipeSQL.setTags(current + [name], for: recipeID, now: now, db) {
                try RecipeSQL.touch(recipeID, now: now, db)
            }
            try SearchIndex.refresh(recipeID, db)
        }
    }

    public func remove(_ tag: String, from recipeID: Recipe.ID) throws {
        guard let name = TagName.normalize(tag) else { throw StoreError.emptyTagName }
        let key = TagName.key(name)
        try writer.write { db in
            try RecipeSQL.requireRecipe(recipeID, db)
            let remaining = try RecipeSQL.tags(recipeID, db).filter { TagName.key($0) != key }
            let now = clock.now()
            if try RecipeSQL.setTags(remaining, for: recipeID, now: now, db) {
                try RecipeSQL.touch(recipeID, now: now, db)
            }
            try SearchIndex.refresh(recipeID, db)
        }
    }

    /// `LIKE` is case-insensitive for ASCII; wildcards in the prefix are escaped.
    static func likePrefix(_ prefix: String) -> String {
        let escaped = prefix
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "%", with: "\\%")
            .replacingOccurrences(of: "_", with: "\\_")
        return escaped + "%"
    }
}
