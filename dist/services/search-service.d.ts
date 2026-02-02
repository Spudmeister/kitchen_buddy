/**
 * Search Service - Full-text search for recipes
 *
 * Provides full-text search across recipe title, ingredients, instructions, and tags.
 * Requirements: 3.5
 */
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
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
export declare class SearchService {
    private db;
    private ftsAvailable;
    constructor(db: Database);
    /**
     * Check if FTS5 is available
     */
    private checkFtsAvailability;
    /**
     * Index a recipe for full-text search
     */
    indexRecipe(recipeId: string): void;
    /**
     * Remove a recipe from the search index
     */
    removeFromIndex(recipeId: string): void;
    /**
     * Search recipes by text query
     * Requirements: 3.5 - Search across title, ingredients, instructions, and tags
     */
    searchRecipes(query: string): Recipe[];
    /**
     * Full-text search using FTS5
     */
    private ftsSearch;
    /**
     * Fallback search using LIKE
     */
    private likeSearch;
    /**
     * Prepare a query string for FTS5
     */
    private prepareFtsQuery;
    /**
     * Get text data for a recipe (for indexing)
     */
    private getRecipeTextData;
    /**
     * Load recipes by IDs
     */
    private loadRecipes;
    /**
     * Load a single recipe by ID
     */
    private loadRecipe;
}
//# sourceMappingURL=search-service.d.ts.map