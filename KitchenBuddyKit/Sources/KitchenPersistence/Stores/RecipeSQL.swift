import Foundation
import GRDB
import KitchenCore

/// Row-level reads and writes shared by the stores. Everything here takes a
/// `Database` and runs inside the caller's transaction.
enum RecipeSQL {
    // MARK: Reads

    static func recipe(_ id: Recipe.ID, _ db: Database) throws -> Recipe? {
        try Row.fetchOne(db, sql: "SELECT * FROM recipes WHERE id = ?", arguments: [id.rawValue]).map(recipe(from:))
    }

    static func recipe(from row: Row) -> Recipe {
        Recipe(id: row.id("id"),
               currentVersion: row["current_version"],
               folderID: row.optionalID("folder_id"),
               parentRecipeID: row.optionalID("parent_recipe_id"),
               archivedAt: row.optionalTimestamp("archived_at"),
               createdAt: row.timestamp("created_at"),
               updatedAt: row.timestamp("updated_at"))
    }

    static func version(_ recipeID: Recipe.ID, number: Int, _ db: Database) throws -> RecipeVersion? {
        try Row.fetchOne(db, sql: "SELECT * FROM recipe_versions WHERE recipe_id = ? AND version = ?",
                         arguments: [recipeID.rawValue, number]).map { try version(from: $0, db) }
    }

    /// Newest first.
    static func versions(_ recipeID: Recipe.ID, _ db: Database) throws -> [RecipeVersion] {
        try Row.fetchAll(db, sql: "SELECT * FROM recipe_versions WHERE recipe_id = ? ORDER BY version DESC",
                         arguments: [recipeID.rawValue]).map { try version(from: $0, db) }
    }

    static func version(from row: Row, _ db: Database) throws -> RecipeVersion {
        let versionID: String = row["id"]
        let ingredients = try Row.fetchAll(db, sql: """
            SELECT * FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order
            """, arguments: [versionID]).map { row in
            Ingredient(id: row.id("id"),
                       name: row["name"],
                       quantity: row.fraction(numerator: "quantity_num", denominator: "quantity_den"),
                       unit: (row["unit"] as String?).flatMap(IngredientUnit.init(rawValue:)),
                       notes: row["notes"],
                       category: (row["category"] as String?).flatMap(IngredientCategory.init(rawValue:)))
        }
        let instructions = try Row.fetchAll(db, sql: """
            SELECT * FROM instructions WHERE recipe_version_id = ? ORDER BY step_number
            """, arguments: [versionID]).map { row in
            Instruction(id: row.id("id"),
                        step: row["step_number"],
                        text: row["text"],
                        durationMinutes: row["duration_minutes"],
                        notes: row["notes"])
        }
        return RecipeVersion(
            id: Tagged(versionID),
            recipeID: row.id("recipe_id"),
            version: row["version"],
            title: row["title"],
            description: row["description"],
            ingredients: ingredients,
            instructions: instructions,
            prepMinutes: row["prep_minutes"],
            cookMinutes: row["cook_minutes"],
            servings: row["servings"],
            sourceURL: (row["source_url"] as String?).flatMap(URL.init(string:)),
            restoredFromVersion: row["restored_from_version"],
            createdAt: row.timestamp("created_at")
        )
    }

    static func tags(_ recipeID: Recipe.ID, _ db: Database) throws -> [String] {
        try String.fetchAll(db, sql: """
            SELECT t.name FROM tags t JOIN recipe_tags rt ON rt.tag_id = t.id
            WHERE rt.recipe_id = ? ORDER BY t.name COLLATE NOCASE
            """, arguments: [recipeID.rawValue])
    }

    /// Chronological.
    static func ratings(_ recipeID: Recipe.ID, _ db: Database) throws -> [Rating] {
        try Row.fetchAll(db, sql: "SELECT * FROM ratings WHERE recipe_id = ? ORDER BY rated_at, rowid",
                         arguments: [recipeID.rawValue]).map(rating(from:))
    }

    /// The newest rating unless a clear came at or after it.
    static func latestRating(_ recipeID: Recipe.ID, _ db: Database) throws -> Rating? {
        guard let rating = try Row.fetchOne(db, sql: "SELECT * FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC, rowid DESC LIMIT 1",
                                            arguments: [recipeID.rawValue]).map(rating(from:)) else { return nil }
        let lastClear = try String.fetchOne(db, sql: "SELECT cleared_at FROM rating_clears WHERE recipe_id = ? ORDER BY cleared_at DESC, rowid DESC LIMIT 1",
                                            arguments: [recipeID.rawValue])
        if let lastClear, lastClear >= rating.ratedAt.sql { return nil }
        return rating
    }

    /// Ratings and clears interleaved, oldest first.
    static func ratingEvents(_ recipeID: Recipe.ID, _ db: Database) throws -> [RatingEvent] {
        let rated = try ratings(recipeID, db).map(RatingEvent.rated)
        let cleared = try Row.fetchAll(db, sql: "SELECT * FROM rating_clears WHERE recipe_id = ? ORDER BY cleared_at, rowid",
                                       arguments: [recipeID.rawValue]).map { row in
            RatingEvent.cleared(id: row.id("id"), recipeID: row.id("recipe_id"), at: row.timestamp("cleared_at"))
        }
        return (rated + cleared).sorted { a, b in
            if a.date != b.date { return a.date < b.date }
            // Same instant: a clear after a rating wins, matching `latestRating`.
            return a.value != nil && b.value == nil
        }
    }

    static func rating(from row: Row) -> Rating {
        Rating(id: row.id("id"), recipeID: row.id("recipe_id"), value: row["value"], ratedAt: row.timestamp("rated_at"))
    }

    static func photos(_ recipeID: Recipe.ID, _ db: Database) throws -> [Photo] {
        try Row.fetchAll(db, sql: """
            SELECT * FROM photos WHERE recipe_id = ? AND removed_at IS NULL ORDER BY sort_order, created_at
            """, arguments: [recipeID.rawValue]).map(photo(from:))
    }

    static func photo(from row: Row) -> Photo {
        Photo(id: row.id("id"), recipeID: row.id("recipe_id"), fileName: row["file_name"],
              width: row["width"], height: row["height"], takenAt: row.optionalTimestamp("taken_at"),
              caption: row["caption"], sortOrder: row["sort_order"],
              createdAt: row.timestamp("created_at"), removedAt: row.optionalTimestamp("removed_at"))
    }

    /// Pinned first, then newest first.
    static func notes(_ recipeID: Recipe.ID, includeDeleted: Bool, _ db: Database) throws -> [RecipeNote] {
        let filter = includeDeleted ? "" : " AND deleted_at IS NULL"
        return try Row.fetchAll(db, sql: """
            SELECT * FROM recipe_notes WHERE recipe_id = ?\(filter)
            ORDER BY pinned DESC, created_at DESC, rowid DESC
            """, arguments: [recipeID.rawValue]).map(note(from:))
    }

    static func note(_ id: RecipeNote.ID, _ db: Database) throws -> RecipeNote? {
        try Row.fetchOne(db, sql: "SELECT * FROM recipe_notes WHERE id = ?", arguments: [id.rawValue]).map(note(from:))
    }

    static func note(from row: Row) -> RecipeNote {
        RecipeNote(id: row.id("id"), recipeID: row.id("recipe_id"), body: row["body"],
                   cookedOn: row.optionalTimestamp("cooked_on"), pinned: row["pinned"],
                   versionAtCreation: row["version_at_creation"],
                   createdAt: row.timestamp("created_at"), updatedAt: row.timestamp("updated_at"),
                   deletedAt: row.optionalTimestamp("deleted_at"))
    }

    // MARK: Serving reports and food overrides (M11)

    /// Chronological.
    static func servingReports(_ recipeID: Recipe.ID, _ db: Database) throws -> [ServingReport] {
        try Row.fetchAll(db, sql: "SELECT * FROM serving_reports WHERE recipe_id = ? ORDER BY reported_at, rowid",
                         arguments: [recipeID.rawValue]).map(servingReport(from:))
    }

    static func latestServingReport(_ recipeID: Recipe.ID, _ db: Database) throws -> ServingReport? {
        try Row.fetchOne(db, sql: "SELECT * FROM serving_reports WHERE recipe_id = ? ORDER BY reported_at DESC, rowid DESC LIMIT 1",
                         arguments: [recipeID.rawValue]).map(servingReport(from:))
    }

    static func servingReport(from row: Row) -> ServingReport {
        ServingReport(id: row.id("id"), recipeID: row.id("recipe_id"), servings: row["servings"],
                      note: row["note"], reportedAt: row.timestamp("reported_at"))
    }

    /// Chronological; `FoodOverride.effective` reduces to the latest per key.
    static func foodOverrides(_ recipeID: Recipe.ID, _ db: Database) throws -> [FoodOverride] {
        try Row.fetchAll(db, sql: "SELECT * FROM food_overrides WHERE recipe_id = ? ORDER BY created_at, rowid",
                         arguments: [recipeID.rawValue]).map { row in
            FoodOverride(id: row.id("id"), recipeID: row.id("recipe_id"), ingredientKey: row["ingredient_key"],
                         foodID: row["food_id"], createdAt: row.timestamp("created_at"))
        }
    }

    /// Chronological, every row; `FoodMapping.effective` reduces it.
    static func foodMappings(_ db: Database) throws -> [FoodMapping] {
        try Row.fetchAll(db, sql: "SELECT * FROM food_mappings ORDER BY created_at, rowid").map { row in
            FoodMapping(id: row.id("id"), ingredientKey: row["ingredient_key"], foodID: row["food_id"],
                        createdAt: row.timestamp("created_at"))
        }
    }

    /// Recipes whose current version has an ingredient with this normalized name.
    static func recipeIDs(withIngredientKey key: String, _ db: Database) throws -> [Recipe.ID] {
        var ids: [Recipe.ID] = []
        let rows = try Row.fetchAll(db, sql: """
            SELECT r.id AS recipe_id, i.name AS name FROM recipes r
            JOIN recipe_versions v ON v.recipe_id = r.id AND v.version = r.current_version
            JOIN ingredients i ON i.recipe_version_id = v.id
            """)
        var seen = Set<String>()
        for row in rows {
            let name: String = row["name"]
            guard FoodMatcher.normalize(name) == key else { continue }
            let id: String = row["recipe_id"]
            if seen.insert(id).inserted { ids.append(Recipe.ID(id)) }
        }
        return ids
    }

    static func detail(_ id: Recipe.ID, version number: Int? = nil, _ db: Database) throws -> RecipeDetail? {
        guard let recipe = try recipe(id, db),
              let version = try version(id, number: number ?? recipe.currentVersion, db) else { return nil }
        return RecipeDetail(recipe: recipe,
                            version: version,
                            tags: try tags(id, db),
                            currentRating: try latestRating(id, db),
                            photos: try photos(id, db),
                            notes: try notes(id, includeDeleted: false, db),
                            latestServingReport: try latestServingReport(id, db))
    }

    @discardableResult
    static func requireRecipe(_ id: Recipe.ID, _ db: Database) throws -> Recipe {
        guard let recipe = try recipe(id, db) else { throw StoreError.recipeNotFound(id) }
        return recipe
    }

    static func requireVersion(_ id: Recipe.ID, number: Int, _ db: Database) throws -> RecipeVersion {
        guard let version = try version(id, number: number, db) else {
            throw StoreError.versionNotFound(id, version: number)
        }
        return version
    }

    // MARK: Writes

    static func insertRecipe(id: Recipe.ID, folderID: Folder.ID?, parentRecipeID: Recipe.ID?,
                             now: Date, _ db: Database) throws {
        try db.execute(sql: """
            INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, archived_at, created_at, updated_at)
            VALUES (?, 1, ?, ?, NULL, ?, ?)
            """, arguments: [id.rawValue, folderID?.rawValue, parentRecipeID?.rawValue, now.sql, now.sql])
    }

    /// Appends version `number` with `content` (already normalized) and
    /// points the recipe at it.
    @discardableResult
    static func insertVersion(recipeID: Recipe.ID, number: Int, content: RecipeContent,
                              restoredFrom: Int?, now: Date, _ db: Database) throws -> RecipeVersion {
        let versionID = RecipeVersion.ID()
        try db.execute(sql: """
            INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_minutes, cook_minutes,
                servings, source_url, restored_from_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, arguments: [versionID.rawValue, recipeID.rawValue, number, content.title, content.description,
                             content.prepMinutes, content.cookMinutes, content.servings,
                             content.sourceURL?.absoluteString, restoredFrom, now.sql])
        for (index, ingredient) in content.ingredients.enumerated() {
            try db.execute(sql: """
                INSERT INTO ingredients (id, recipe_version_id, sort_order, name, quantity_num, quantity_den, unit, notes, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [Ingredient.ID().rawValue, versionID.rawValue, index, ingredient.name,
                                 ingredient.quantity?.numerator, ingredient.quantity?.denominator,
                                 ingredient.unit?.rawValue, ingredient.notes, ingredient.category?.rawValue])
        }
        for (index, instruction) in content.instructions.enumerated() {
            try db.execute(sql: """
                INSERT INTO instructions (id, recipe_version_id, step_number, text, duration_minutes, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """, arguments: [Instruction.ID().rawValue, versionID.rawValue, index + 1, instruction.text,
                                 instruction.durationMinutes, instruction.notes])
        }
        try db.execute(sql: "UPDATE recipes SET current_version = ?, updated_at = ? WHERE id = ?",
                       arguments: [number, now.sql, recipeID.rawValue])
        return try requireVersion(recipeID, number: number, db)
    }

    static func touch(_ recipeID: Recipe.ID, now: Date, _ db: Database) throws {
        try db.execute(sql: "UPDATE recipes SET updated_at = ? WHERE id = ?", arguments: [now.sql, recipeID.rawValue])
    }

    /// Replaces the recipe's tag set. Tag rows are created on first use and
    /// never removed. Returns true when the set changed.
    @discardableResult
    static func setTags(_ names: [String], for recipeID: Recipe.ID, now: Date, _ db: Database) throws -> Bool {
        let wanted = TagName.normalize(names)
        let current = try tags(recipeID, db)
        guard Set(wanted.map(TagName.key)) != Set(current.map(TagName.key)) else { return false }
        try db.execute(sql: "DELETE FROM recipe_tags WHERE recipe_id = ?", arguments: [recipeID.rawValue])
        for name in wanted {
            let tagID = try ensureTag(name, now: now, db)
            try db.execute(sql: "INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
                           arguments: [recipeID.rawValue, tagID.rawValue])
        }
        return true
    }

    static func ensureTag(_ name: String, now: Date, _ db: Database) throws -> Tag.ID {
        if let existing = try String.fetchOne(db, sql: "SELECT id FROM tags WHERE name = ? COLLATE NOCASE", arguments: [name]) {
            return Tag.ID(existing)
        }
        let id = Tag.ID()
        try db.execute(sql: "INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)",
                       arguments: [id.rawValue, name, now.sql])
        return id
    }
}
