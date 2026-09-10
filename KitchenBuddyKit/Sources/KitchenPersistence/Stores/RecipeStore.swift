import Foundation
import GRDB
import KitchenCore

/// The one writer for recipes, versions, tags on recipes, ratings, and
/// notes. Every method is a single transaction ending in a search refresh.
///
/// Requirements: kitchen-buddy-ios 1.6, 2.1–2.5, 3.1–3.5, 4.1–4.4, 6.1–6.3, 7.1–7.5, 15.1–15.4, 16.1, 17.1
public final class RecipeStore: RecipeStoring {
    let handle: DatabaseHandle
    let clock: Clock

    init(handle: DatabaseHandle, clock: Clock) {
        self.handle = handle
        self.clock = clock
    }

    var writer: any DatabaseWriter { handle.writer }

    // MARK: Create and edit

    public func create(_ draft: RecipeDraft) throws -> RecipeDetail {
        try writer.write { db in try self.create(draft, parent: nil, db) }
    }

    func create(_ draft: RecipeDraft, parent: Recipe.ID?, _ db: Database) throws -> RecipeDetail {
        let draft = draft.normalized()
        let errors = draft.validationErrors
        guard errors.isEmpty else { throw StoreError.invalidDraft(errors) }
        if let folderID = draft.folderID { try FolderStore.requireLive(folderID, db) }
        let now = clock.now()
        let id = Recipe.ID()
        try RecipeSQL.insertRecipe(id: id, folderID: draft.folderID, parentRecipeID: parent, now: now, db)
        try RecipeSQL.insertVersion(recipeID: id, number: 1, content: draft.content, restoredFrom: nil, now: now, db)
        try RecipeSQL.setTags(draft.tags, for: id, now: now, db)
        try SearchIndex.refresh(id, db)
        guard let detail = try RecipeSQL.detail(id, db) else { throw StoreError.recipeNotFound(id) }
        return detail
    }

    public func save(_ draft: RecipeDraft, for id: Recipe.ID) throws -> RecipeDetail {
        try writer.write { db in
            let draft = draft.normalized()
            let errors = draft.validationErrors
            guard errors.isEmpty else { throw StoreError.invalidDraft(errors) }
            let recipe = try RecipeSQL.requireRecipe(id, db)
            let current = try RecipeSQL.requireVersion(id, number: recipe.currentVersion, db)
            let now = clock.now()
            var changed = false

            if draft.content != current.content.normalized() {
                try RecipeSQL.insertVersion(recipeID: id, number: recipe.currentVersion + 1,
                                            content: draft.content, restoredFrom: nil, now: now, db)
                changed = true
            }
            if draft.folderID != recipe.folderID {
                if let folderID = draft.folderID { try FolderStore.requireLive(folderID, db) }
                try db.execute(sql: "UPDATE recipes SET folder_id = ? WHERE id = ?",
                               arguments: [draft.folderID?.rawValue, id.rawValue])
                changed = true
            }
            if try RecipeSQL.setTags(draft.tags, for: id, now: now, db) { changed = true }
            if changed { try RecipeSQL.touch(id, now: now, db) }
            try SearchIndex.refresh(id, db)
            guard let detail = try RecipeSQL.detail(id, db) else { throw StoreError.recipeNotFound(id) }
            return detail
        }
    }

    public func duplicate(_ id: Recipe.ID) throws -> RecipeDetail {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            let version = try RecipeSQL.requireVersion(id, number: recipe.currentVersion, db)
            let draft = RecipeDraft(content: version.content, tags: try RecipeSQL.tags(id, db),
                                    folderID: recipe.folderID)
            return try self.create(draft, parent: id, db)
        }
    }

    // MARK: Read

    public func detail(_ id: Recipe.ID) throws -> RecipeDetail? {
        try writer.read { db in try RecipeSQL.detail(id, db) }
    }

    public func detail(_ id: Recipe.ID, version: Int) throws -> RecipeDetail? {
        try writer.read { db in try RecipeSQL.detail(id, version: version, db) }
    }

    public func versions(_ id: Recipe.ID) throws -> [RecipeVersion] {
        try writer.read { db in try RecipeSQL.versions(id, db) }
    }

    public func heritage(_ id: Recipe.ID) throws -> RecipeHeritage? {
        try writer.read { db in
            guard let recipe = try RecipeSQL.recipe(id, db), let summary = try SearchIndex.summary(id, db) else {
                return nil
            }
            var ancestors: [RecipeSummary] = []
            var visited: Set<Recipe.ID> = [id]
            var cursor = recipe.parentRecipeID
            while let parentID = cursor, visited.insert(parentID).inserted,
                  let parent = try RecipeSQL.recipe(parentID, db) {
                if let parentSummary = try SearchIndex.summary(parentID, db) { ancestors.append(parentSummary) }
                cursor = parent.parentRecipeID
            }
            let childIDs = try String.fetchAll(db, sql: """
                SELECT id FROM recipes WHERE parent_recipe_id = ? ORDER BY created_at, id
                """, arguments: [id.rawValue])
            let children = try childIDs.compactMap { try SearchIndex.summary(Recipe.ID($0), db) }
            return RecipeHeritage(recipe: summary, parent: ancestors.first, ancestors: ancestors, children: children)
        }
    }

    public func summary(_ id: Recipe.ID) throws -> RecipeSummary? {
        try writer.read { db in try SearchIndex.summary(id, db) }
    }

    public func summaries(_ query: RecipeQuery) throws -> [RecipeSummary] {
        try Signpost.measure("search") { try writer.read { db in try SearchIndex.summaries(query, db) } }
    }

    public func observeSummaries(_ query: RecipeQuery) -> AsyncThrowingStream<[RecipeSummary], Error> {
        let observation = ValueObservation.tracking { db in try SearchIndex.summaries(query, db) }
        let writer = handle.writer
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    for try await value in observation.values(in: writer) { continuation.yield(value) }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    public func count(includeArchived: Bool) throws -> Int {
        try writer.read { db in
            let sql = includeArchived ? "SELECT COUNT(*) FROM recipes" : "SELECT COUNT(*) FROM recipes WHERE archived_at IS NULL"
            return try Int.fetchOne(db, sql: sql) ?? 0
        }
    }

    // MARK: Versions

    public func restore(_ id: Recipe.ID, toVersion number: Int) throws -> RecipeDetail {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            let source = try RecipeSQL.requireVersion(id, number: number, db)
            try RecipeSQL.insertVersion(recipeID: id, number: recipe.currentVersion + 1,
                                        content: source.content.normalized(), restoredFrom: number,
                                        now: clock.now(), db)
            try SearchIndex.refresh(id, db)
            guard let detail = try RecipeSQL.detail(id, db) else { throw StoreError.recipeNotFound(id) }
            return detail
        }
    }

    // MARK: Archive

    public func archive(_ id: Recipe.ID) throws {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            guard recipe.archivedAt == nil else { return }
            let now = clock.now()
            try db.execute(sql: "UPDATE recipes SET archived_at = ?, updated_at = ? WHERE id = ?",
                           arguments: [now.sql, now.sql, id.rawValue])
            try SearchIndex.refresh(id, db)
        }
    }

    public func unarchive(_ id: Recipe.ID) throws {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            guard recipe.archivedAt != nil else { return }
            let now = clock.now()
            try db.execute(sql: "UPDATE recipes SET archived_at = NULL, updated_at = ? WHERE id = ?",
                           arguments: [now.sql, id.rawValue])
            try SearchIndex.refresh(id, db)
        }
    }

    // MARK: Placement

    public func move(_ id: Recipe.ID, toFolder folderID: Folder.ID?) throws {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            if let folderID { try FolderStore.requireLive(folderID, db) }
            guard recipe.folderID != folderID else { return }
            let now = clock.now()
            try db.execute(sql: "UPDATE recipes SET folder_id = ?, updated_at = ? WHERE id = ?",
                           arguments: [folderID?.rawValue, now.sql, id.rawValue])
            try SearchIndex.refresh(id, db)
        }
    }

    public func setTags(_ tags: [String], for id: Recipe.ID) throws {
        try writer.write { db in
            try RecipeSQL.requireRecipe(id, db)
            let now = clock.now()
            if try RecipeSQL.setTags(tags, for: id, now: now, db) {
                try RecipeSQL.touch(id, now: now, db)
            }
            try SearchIndex.refresh(id, db)
        }
    }

    // MARK: Ratings

    @discardableResult
    public func rate(_ id: Recipe.ID, value: Int) throws -> Rating {
        guard Rating.range.contains(value) else { throw StoreError.invalidRating(value) }
        return try writer.write { db in
            try RecipeSQL.requireRecipe(id, db)
            let now = clock.now()
            let rating = Rating(recipeID: id, value: value, ratedAt: now)
            try db.execute(sql: "INSERT INTO ratings (id, recipe_id, value, rated_at) VALUES (?, ?, ?, ?)",
                           arguments: [rating.id.rawValue, id.rawValue, value, now.sql])
            try RecipeSQL.touch(id, now: now, db)
            try SearchIndex.refresh(id, db)
            return rating
        }
    }

    public func clearRating(_ id: Recipe.ID) throws {
        try writer.write { db in
            try RecipeSQL.requireRecipe(id, db)
            let now = clock.now()
            try db.execute(sql: "INSERT INTO rating_clears (id, recipe_id, cleared_at) VALUES (?, ?, ?)",
                           arguments: [Tagged<RatingEvent>().rawValue, id.rawValue, now.sql])
            try RecipeSQL.touch(id, now: now, db)
            try SearchIndex.refresh(id, db)
        }
    }

    public func ratings(_ id: Recipe.ID) throws -> [Rating] {
        try writer.read { db in try RecipeSQL.ratings(id, db) }
    }

    public func ratingEvents(_ id: Recipe.ID) throws -> [RatingEvent] {
        try writer.read { db in try RecipeSQL.ratingEvents(id, db) }
    }

    // MARK: Notes

    @discardableResult
    public func addNote(to id: Recipe.ID, body: String, cookedOn: Date?) throws -> RecipeNote {
        try writer.write { db in
            let recipe = try RecipeSQL.requireRecipe(id, db)
            let now = clock.now()
            let note = RecipeNote(recipeID: id, body: body, cookedOn: cookedOn.map(Timestamp.normalize),
                                  pinned: false, versionAtCreation: recipe.currentVersion,
                                  createdAt: now, updatedAt: now)
            try db.execute(sql: """
                INSERT INTO recipe_notes (id, recipe_id, body, cooked_on, pinned, version_at_creation, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?)
                """, arguments: [note.id.rawValue, id.rawValue, body, note.cookedOn.sql,
                                 recipe.currentVersion, now.sql, now.sql])
            try RecipeSQL.touch(id, now: now, db)
            try SearchIndex.refresh(id, db)
            return note
        }
    }

    @discardableResult
    public func updateNote(_ noteID: RecipeNote.ID, body: String, cookedOn: Date?) throws -> RecipeNote {
        try updatingNote(noteID) { note, now, db in
            try db.execute(sql: "UPDATE recipe_notes SET body = ?, cooked_on = ?, updated_at = ? WHERE id = ?",
                           arguments: [body, cookedOn.map(Timestamp.normalize).sql, now.sql, noteID.rawValue])
        }
    }

    @discardableResult
    public func setNotePinned(_ noteID: RecipeNote.ID, _ pinned: Bool) throws -> RecipeNote {
        try updatingNote(noteID) { _, now, db in
            try db.execute(sql: "UPDATE recipe_notes SET pinned = ?, updated_at = ? WHERE id = ?",
                           arguments: [pinned, now.sql, noteID.rawValue])
        }
    }

    public func deleteNote(_ noteID: RecipeNote.ID) throws {
        try updatingNote(noteID) { _, now, db in
            try db.execute(sql: "UPDATE recipe_notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
                           arguments: [now.sql, now.sql, noteID.rawValue])
        }
    }

    public func undeleteNote(_ noteID: RecipeNote.ID) throws {
        try updatingNote(noteID) { _, now, db in
            try db.execute(sql: "UPDATE recipe_notes SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL",
                           arguments: [now.sql, noteID.rawValue])
        }
    }

    // MARK: Servings you get and health (M11)

    @discardableResult
    public func reportServings(_ id: Recipe.ID, servings: Int?, note: String?) throws -> ServingReport {
        if let servings, !(1...999).contains(servings) { throw StoreError.invalidServings(servings) }
        return try writer.write { db in
            try RecipeSQL.requireRecipe(id, db)
            let now = clock.now()
            let trimmed = note?.trimmingCharacters(in: .whitespacesAndNewlines)
            let report = ServingReport(recipeID: id, servings: servings,
                                       note: trimmed?.isEmpty == false ? trimmed : nil, reportedAt: now)
            try db.execute(sql: """
                INSERT INTO serving_reports (id, recipe_id, servings, note, reported_at) VALUES (?, ?, ?, ?, ?)
                """, arguments: [report.id.rawValue, id.rawValue, servings, report.note, now.sql])
            try SearchIndex.refresh(id, db)
            return report
        }
    }

    public func servingReports(_ id: Recipe.ID) throws -> [ServingReport] {
        try writer.read { db in try RecipeSQL.servingReports(id, db) }
    }

    @discardableResult
    public func setFoodOverride(_ id: Recipe.ID, ingredientName: String, foodID: Food.ID?) throws -> FoodOverride {
        if let foodID, FoodTable.food(id: foodID) == nil { throw StoreError.unknownFood(foodID) }
        return try writer.write { db in
            try self.appendOverride(id, key: FoodMatcher.normalize(ingredientName), foodID: foodID, marker: false, db)
        }
    }

    public func clearFoodOverride(_ id: Recipe.ID, ingredientName: String) throws {
        try writer.write { db in
            _ = try self.appendOverride(id, key: FoodMatcher.normalize(ingredientName), foodID: nil, marker: true, db)
        }
    }

    /// `marker` writes the "automatic again" sentinel: a row whose food id
    /// is the empty string, which `FoodOverride.effective` treats as absent.
    private func appendOverride(_ id: Recipe.ID, key: String, foodID: Food.ID?, marker: Bool, _ db: Database) throws -> FoodOverride {
        try RecipeSQL.requireRecipe(id, db)
        let now = clock.now()
        let override = FoodOverride(recipeID: id, ingredientKey: key, foodID: marker ? FoodOverride.automaticMarker : foodID, createdAt: now)
        try db.execute(sql: """
            INSERT INTO food_overrides (id, recipe_id, ingredient_key, food_id, created_at) VALUES (?, ?, ?, ?, ?)
            """, arguments: [override.id.rawValue, id.rawValue, key, override.foodID, now.sql])
        try SearchIndex.refresh(id, db)
        return override
    }

    public func foodOverrides(_ id: Recipe.ID) throws -> [FoodOverride] {
        try writer.read { db in try RecipeSQL.foodOverrides(id, db) }
    }

    @discardableResult
    public func setFoodMapping(ingredientName: String, foodID: Food.ID?) throws -> FoodMapping {
        if let foodID, FoodTable.food(id: foodID) == nil { throw StoreError.unknownFood(foodID) }
        return try writer.write { db in try self.appendMapping(key: FoodMatcher.normalize(ingredientName), foodID: foodID, db) }
    }

    public func clearFoodMapping(ingredientName: String) throws {
        try writer.write { db in
            _ = try self.appendMapping(key: FoodMatcher.normalize(ingredientName), foodID: FoodOverride.automaticMarker, db)
        }
    }

    /// Appends the row, then refreshes the health projection of every
    /// recipe that uses the ingredient name (Requirement 21.11).
    private func appendMapping(key: String, foodID: Food.ID?, _ db: Database) throws -> FoodMapping {
        let now = clock.now()
        let mapping = FoodMapping(ingredientKey: key, foodID: foodID, createdAt: now)
        try db.execute(sql: "INSERT INTO food_mappings (id, ingredient_key, food_id, created_at) VALUES (?, ?, ?, ?)",
                       arguments: [mapping.id.rawValue, key, mapping.foodID, now.sql])
        for id in try RecipeSQL.recipeIDs(withIngredientKey: key, db) { try HealthIndex.refresh(id, db) }
        return mapping
    }

    public func foodMappings() throws -> [FoodMapping] {
        try writer.read { db in try RecipeSQL.foodMappings(db) }
    }

    public func effectiveFoodChoices(_ id: Recipe.ID) throws -> [String: Food.ID?] {
        try writer.read { db in try Self.effectiveFoodChoices(id, db) }
    }

    static func effectiveFoodChoices(_ id: Recipe.ID, _ db: Database) throws -> [String: Food.ID?] {
        FoodMapping.merge(mappings: FoodMapping.effective(try RecipeSQL.foodMappings(db)),
                          overrides: FoodOverride.effective(try RecipeSQL.foodOverrides(id, db)))
    }

    public func nutrition(_ id: Recipe.ID) throws -> RecipeNutrition? {
        try writer.read { db in
            guard let detail = try RecipeSQL.detail(id, db) else { return nil }
            return NutritionEstimator.estimate(ingredients: detail.version.ingredients,
                                               servings: detail.effectiveServings,
                                               overrides: try Self.effectiveFoodChoices(id, db))
        }
    }

    public func notes(_ id: Recipe.ID, includeDeleted: Bool = false) throws -> [RecipeNote] {
        try writer.read { db in try RecipeSQL.notes(id, includeDeleted: includeDeleted, db) }
    }

    @discardableResult
    private func updatingNote(_ noteID: RecipeNote.ID,
                              _ change: (RecipeNote, Date, Database) throws -> Void) throws -> RecipeNote {
        try writer.write { db in
            guard let note = try RecipeSQL.note(noteID, db) else { throw StoreError.noteNotFound(noteID) }
            let now = clock.now()
            try change(note, now, db)
            try RecipeSQL.touch(note.recipeID, now: now, db)
            try SearchIndex.refresh(note.recipeID, db)
            guard let updated = try RecipeSQL.note(noteID, db) else { throw StoreError.noteNotFound(noteID) }
            return updated
        }
    }
}
