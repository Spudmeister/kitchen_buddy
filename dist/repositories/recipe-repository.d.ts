/**
 * Recipe repository for database operations
 */
import type { Database } from '../db/database.js';
import type { Recipe, RecipeInput } from '../types/recipe.js';
/**
 * Repository for recipe CRUD operations
 */
export declare class RecipeRepository {
    private db;
    constructor(db: Database);
    /**
     * Create a new recipe
     */
    createRecipe(input: RecipeInput): Recipe;
    /**
     * Get a recipe by ID
     */
    getRecipe(id: string, version?: number): Recipe | undefined;
    /**
     * Update a recipe (creates a new version)
     */
    updateRecipe(id: string, input: RecipeInput): Recipe;
    /**
     * Archive (soft delete) a recipe
     */
    archiveRecipe(id: string): void;
    /**
     * Restore an archived recipe
     */
    restoreRecipe(id: string): void;
}
//# sourceMappingURL=recipe-repository.d.ts.map