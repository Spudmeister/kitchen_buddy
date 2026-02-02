/**
 * Search Service - Full-text search for recipes
 *
 * Provides full-text search across recipe title, ingredients, instructions, and tags.
 * Requirements: 3.5
 */
/**
 * Service for full-text search of recipes
 */
export class SearchService {
    db;
    ftsAvailable = false;
    constructor(db) {
        this.db = db;
        this.checkFtsAvailability();
    }
    /**
     * Check if FTS5 is available
     */
    checkFtsAvailability() {
        try {
            // Check if the FTS table exists
            const result = this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='recipes_fts'");
            this.ftsAvailable = result !== undefined;
        }
        catch {
            this.ftsAvailable = false;
        }
    }
    /**
     * Index a recipe for full-text search
     */
    indexRecipe(recipeId) {
        if (!this.ftsAvailable) {
            return;
        }
        // Get recipe data
        const recipeData = this.getRecipeTextData(recipeId);
        if (!recipeData) {
            return;
        }
        const { title, description, ingredientsText, instructionsText, tagsText } = recipeData;
        // Remove existing entry if any
        try {
            this.db.run('DELETE FROM recipes_fts WHERE recipe_id = ?', [recipeId]);
        }
        catch {
            // Ignore if not found
        }
        // Insert into FTS table
        try {
            this.db.run(`INSERT INTO recipes_fts (recipe_id, title, description, ingredients_text, instructions_text, tags_text)
         VALUES (?, ?, ?, ?, ?, ?)`, [recipeId, title, description ?? '', ingredientsText, instructionsText, tagsText]);
        }
        catch {
            // FTS insert failed, search will fall back to LIKE
        }
    }
    /**
     * Remove a recipe from the search index
     */
    removeFromIndex(recipeId) {
        if (!this.ftsAvailable) {
            return;
        }
        try {
            this.db.run('DELETE FROM recipes_fts WHERE recipe_id = ?', [recipeId]);
        }
        catch {
            // Ignore errors
        }
    }
    /**
     * Search recipes by text query
     * Requirements: 3.5 - Search across title, ingredients, instructions, and tags
     */
    searchRecipes(query) {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length === 0) {
            return [];
        }
        // Try FTS search first, fall back to LIKE search
        if (this.ftsAvailable) {
            return this.ftsSearch(normalizedQuery);
        }
        else {
            return this.likeSearch(normalizedQuery);
        }
    }
    /**
     * Full-text search using FTS5
     */
    ftsSearch(query) {
        try {
            // Escape special FTS characters and prepare query
            const ftsQuery = this.prepareFtsQuery(query);
            const rows = this.db.exec(`SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ? ORDER BY rank`, [ftsQuery]);
            const recipeIds = rows.map((row) => row[0]);
            return this.loadRecipes(recipeIds);
        }
        catch {
            // Fall back to LIKE search if FTS fails
            return this.likeSearch(query);
        }
    }
    /**
     * Fallback search using LIKE
     */
    likeSearch(query) {
        const likePattern = `%${query}%`;
        // Search in recipe versions (title, description)
        const titleMatches = this.db.exec(`SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       WHERE r.archived_at IS NULL AND (rv.title LIKE ? OR rv.description LIKE ?)`, [likePattern, likePattern]);
        // Search in ingredients
        const ingredientMatches = this.db.exec(`SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       JOIN ingredients i ON rv.id = i.recipe_version_id
       WHERE r.archived_at IS NULL AND i.name LIKE ?`, [likePattern]);
        // Search in instructions
        const instructionMatches = this.db.exec(`SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       JOIN instructions inst ON rv.id = inst.recipe_version_id
       WHERE r.archived_at IS NULL AND inst.text LIKE ?`, [likePattern]);
        // Search in tags
        const tagMatches = this.db.exec(`SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_tags rt ON r.id = rt.recipe_id
       JOIN tags t ON rt.tag_id = t.id
       WHERE r.archived_at IS NULL AND t.name LIKE ?`, [likePattern]);
        // Combine all matches (unique recipe IDs)
        const allIds = new Set();
        for (const rows of [titleMatches, ingredientMatches, instructionMatches, tagMatches]) {
            for (const row of rows) {
                allIds.add(row[0]);
            }
        }
        return this.loadRecipes([...allIds]);
    }
    /**
     * Prepare a query string for FTS5
     */
    prepareFtsQuery(query) {
        // For simple queries, wrap each word in quotes to do exact matching
        // and join with OR for broader matching
        const words = query.split(/\s+/).filter((w) => w.length > 0);
        if (words.length === 1) {
            // Single word: use prefix matching
            return `"${words[0]}"*`;
        }
        // Multiple words: match any word
        return words.map((w) => `"${w}"*`).join(' OR ');
    }
    /**
     * Get text data for a recipe (for indexing)
     */
    getRecipeTextData(recipeId) {
        // Get recipe version
        const versionRow = this.db.get(`SELECT rv.id, rv.title, rv.description
       FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       WHERE r.id = ?`, [recipeId]);
        if (!versionRow) {
            return null;
        }
        const [versionId, title, description] = versionRow;
        // Get ingredients text
        const ingredientRows = this.db.exec('SELECT name FROM ingredients WHERE recipe_version_id = ?', [versionId]);
        const ingredientsText = ingredientRows.map((row) => row[0]).join(' ');
        // Get instructions text
        const instructionRows = this.db.exec('SELECT text FROM instructions WHERE recipe_version_id = ?', [versionId]);
        const instructionsText = instructionRows.map((row) => row[0]).join(' ');
        // Get tags text
        const tagRows = this.db.exec(`SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`, [recipeId]);
        const tagsText = tagRows.map((row) => row[0]).join(' ');
        return { title, description, ingredientsText, instructionsText, tagsText };
    }
    /**
     * Load recipes by IDs
     */
    loadRecipes(ids) {
        return ids
            .map((id) => this.loadRecipe(id))
            .filter((r) => r !== undefined);
    }
    /**
     * Load a single recipe by ID
     */
    loadRecipe(id) {
        // Get recipe metadata
        const recipeRow = this.db.get('SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?', [id]);
        if (!recipeRow) {
            return undefined;
        }
        const [recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt] = recipeRow;
        // Get version data
        const versionRow = this.db.get(`SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`, [recipeId, currentVersion]);
        if (!versionRow) {
            return undefined;
        }
        const [versionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, versionCreatedAt,] = versionRow;
        // Get ingredients
        const ingredientRows = this.db.exec(`SELECT id, name, quantity, unit, notes, category
       FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`, [versionId]);
        const ingredients = ingredientRows.map((row) => ({
            id: row[0],
            name: row[1],
            quantity: row[2],
            unit: row[3],
            notes: row[4] ?? undefined,
            category: row[5] ?? undefined,
        }));
        // Get instructions
        const instructionRows = this.db.exec(`SELECT id, step_number, text, duration_minutes, notes
       FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`, [versionId]);
        const instructions = instructionRows.map((row) => ({
            id: row[0],
            step: row[1],
            text: row[2],
            duration: row[3] != null ? { minutes: row[3] } : undefined,
            notes: row[4] ?? undefined,
        }));
        // Get tags
        const tagRows = this.db.exec(`SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`, [recipeId]);
        const tags = tagRows.map((row) => row[0]);
        // Get rating (latest)
        const ratingRow = this.db.get('SELECT rating FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC LIMIT 1', [recipeId]);
        return {
            id: recipeId,
            currentVersion,
            title,
            description: description ?? undefined,
            ingredients,
            instructions,
            prepTime: { minutes: prepTimeMinutes ?? 0 },
            cookTime: { minutes: cookTimeMinutes ?? 0 },
            servings,
            tags,
            rating: ratingRow?.[0],
            sourceUrl: sourceUrl ?? undefined,
            folderId: folderId ?? undefined,
            parentRecipeId: parentRecipeId ?? undefined,
            createdAt: new Date(createdAt),
            updatedAt: new Date(versionCreatedAt),
            archivedAt: archivedAt ? new Date(archivedAt) : undefined,
        };
    }
}
//# sourceMappingURL=search-service.js.map