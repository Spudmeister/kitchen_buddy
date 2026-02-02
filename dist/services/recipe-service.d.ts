/**
 * Recipe Service - Business logic for recipe management
 *
 * Provides CRUD operations with versioning support for recipes.
 */
import type { Database } from '../db/database.js';
import type { Recipe, RecipeInput, RecipeVersion, RecipeHeritage } from '../types/recipe.js';
/**
 * Service for managing recipes with versioning support
 */
export declare class RecipeService {
    private db;
    constructor(db: Database);
    /**
     * Create a new recipe
     * Requirements: 1.1 - Store recipe with all fields
     */
    createRecipe(input: RecipeInput): Recipe;
    /**
     * Get a recipe by ID, optionally at a specific version
     */
    getRecipe(id: string, version?: number): Recipe | undefined;
    /**
     * Update a recipe - creates a new version while preserving history
     * Requirements: 1.2 - Create new version on edit, preserve previous
     */
    updateRecipe(id: string, input: RecipeInput): Recipe;
    /**
     * Archive (soft delete) a recipe
     * Requirements: 1.4 - Mark as archived rather than permanently removing
     */
    archiveRecipe(id: string): void;
    /**
     * Restore an archived recipe to active state
     */
    unarchiveRecipe(id: string): void;
    /**
     * Get version history for a recipe
     * Requirements: 1.3 - Display all versions with timestamps
     */
    getVersionHistory(id: string): RecipeVersion[];
    /**
     * Restore a recipe to a specific version
     * Requirements: 1.3 - Allow restoration of any version
     */
    restoreVersion(id: string, version: number): Recipe;
    /**
     * Duplicate a recipe with heritage tracking
     * Requirements: 1.10 - Create new recipe with reference to parent
     */
    duplicateRecipe(id: string): Recipe;
    /**
     * Get recipe heritage (parent, ancestors, children)
     * Requirements: 1.11 - Display recipe heritage
     */
    getRecipeHeritage(id: string): RecipeHeritage;
    /**
     * Check if a recipe exists
     */
    exists(id: string): boolean;
    /**
     * Check if a recipe is archived
     */
    isArchived(id: string): boolean;
    private insertIngredients;
    private insertInstructions;
    private insertTags;
    private getIngredients;
    private getInstructions;
    private getTags;
}
//# sourceMappingURL=recipe-service.d.ts.map