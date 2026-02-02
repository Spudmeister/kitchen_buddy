/**
 * Search Service - Full-text search for recipes
 *
 * Provides full-text search across recipe title, ingredients, instructions, and tags.
 * Requirements: 3.5
 */

import { v4 as _uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import { RecipeRepository } from '../repositories/recipe-repository.js';

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** The matching recipe */
  recipe: Recipe;
  /** Relevance score (higher is more relevant) */
  score: number;
}

/**
 * Service for full-text search of recipes
 */
export class SearchService {
  private ftsAvailable: boolean = false;
  private repository: RecipeRepository;

  constructor(private db: Database) {
    this.checkFtsAvailability();
    this.repository = new RecipeRepository(db);
  }

  /**
   * Check if FTS5 is available
   */
  private checkFtsAvailability(): void {
    try {
      // Check if the FTS table exists
      const result = this.db.get<[string]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recipes_fts'"
      );
      this.ftsAvailable = result !== undefined;
    } catch {
      this.ftsAvailable = false;
    }
  }

  /**
   * Index a recipe for full-text search
   */
  indexRecipe(recipeId: string): void {
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
    } catch {
      // Ignore if not found
    }

    // Insert into FTS table
    try {
      this.db.run(
        `INSERT INTO recipes_fts (recipe_id, title, description, ingredients_text, instructions_text, tags_text)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recipeId, title, description ?? '', ingredientsText, instructionsText, tagsText]
      );
    } catch {
      // FTS insert failed, search will fall back to LIKE
    }
  }

  /**
   * Remove a recipe from the search index
   */
  removeFromIndex(recipeId: string): void {
    if (!this.ftsAvailable) {
      return;
    }

    try {
      this.db.run('DELETE FROM recipes_fts WHERE recipe_id = ?', [recipeId]);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Search recipes by text query
   * Requirements: 3.5 - Search across title, ingredients, instructions, and tags
   */
  searchRecipes(query: string): Recipe[] {
    const normalizedQuery = query.trim();
    
    if (normalizedQuery.length === 0) {
      return [];
    }

    // Try FTS search first, fall back to LIKE search
    if (this.ftsAvailable) {
      return this.ftsSearch(normalizedQuery);
    } else {
      return this.likeSearch(normalizedQuery);
    }
  }

  /**
   * Full-text search using FTS5
   */
  private ftsSearch(query: string): Recipe[] {
    try {
      // Escape special FTS characters and prepare query
      const ftsQuery = this.prepareFtsQuery(query);

      const rows = this.db.exec(
        `SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ? ORDER BY rank`,
        [ftsQuery]
      );

      const recipeIds = rows.map((row) => row[0] as string);
      return this.loadRecipes(recipeIds);
    } catch {
      // Fall back to LIKE search if FTS fails
      return this.likeSearch(query);
    }
  }

  /**
   * Fallback search using LIKE
   */
  private likeSearch(query: string): Recipe[] {
    const likePattern = `%${query}%`;

    // Search in recipe versions (title, description)
    const titleMatches = this.db.exec(
      `SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       WHERE r.archived_at IS NULL AND (rv.title LIKE ? OR rv.description LIKE ?)`,
      [likePattern, likePattern]
    );

    // Search in ingredients
    const ingredientMatches = this.db.exec(
      `SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       JOIN ingredients i ON rv.id = i.recipe_version_id
       WHERE r.archived_at IS NULL AND i.name LIKE ?`,
      [likePattern]
    );

    // Search in instructions
    const instructionMatches = this.db.exec(
      `SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       JOIN instructions inst ON rv.id = inst.recipe_version_id
       WHERE r.archived_at IS NULL AND inst.text LIKE ?`,
      [likePattern]
    );

    // Search in tags
    const tagMatches = this.db.exec(
      `SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_tags rt ON r.id = rt.recipe_id
       JOIN tags t ON rt.tag_id = t.id
       WHERE r.archived_at IS NULL AND t.name LIKE ?`,
      [likePattern]
    );

    // Combine all matches (unique recipe IDs)
    const allIds = new Set<string>();
    for (const rows of [titleMatches, ingredientMatches, instructionMatches, tagMatches]) {
      for (const row of rows) {
        allIds.add(row[0] as string);
      }
    }

    return this.loadRecipes([...allIds]);
  }

  /**
   * Prepare a query string for FTS5
   */
  private prepareFtsQuery(query: string): string {
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
  private getRecipeTextData(recipeId: string): {
    title: string;
    description: string | null;
    ingredientsText: string;
    instructionsText: string;
    tagsText: string;
  } | null {
    // Get recipe version
    const versionRow = this.db.get<[string, string, string | null]>(
      `SELECT rv.id, rv.title, rv.description
       FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND rv.version = r.current_version
       WHERE r.id = ?`,
      [recipeId]
    );

    if (!versionRow) {
      return null;
    }

    const [versionId, title, description] = versionRow;

    // Get ingredients text
    const ingredientRows = this.db.exec(
      'SELECT name FROM ingredients WHERE recipe_version_id = ?',
      [versionId]
    );
    const ingredientsText = ingredientRows.map((row) => row[0] as string).join(' ');

    // Get instructions text
    const instructionRows = this.db.exec(
      'SELECT text FROM instructions WHERE recipe_version_id = ?',
      [versionId]
    );
    const instructionsText = instructionRows.map((row) => row[0] as string).join(' ');

    // Get tags text
    const tagRows = this.db.exec(
      `SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`,
      [recipeId]
    );
    const tagsText = tagRows.map((row) => row[0] as string).join(' ');

    return { title, description, ingredientsText, instructionsText, tagsText };
  }

  /**
   * Load recipes by IDs
   */
  private loadRecipes(ids: string[]): Recipe[] {
    return ids
      .map((id) => this.repository.getRecipe(id))
      .filter((r): r is Recipe => r !== undefined);
  }
}
