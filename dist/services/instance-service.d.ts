/**
 * Recipe Instance Service - Manages recipe cook configurations
 *
 * Requirements: 18.1, 18.2, 18.3 - Capture and restore exact cooking configurations
 */
import type { Database } from '../db/database.js';
import type { RecipeInstance, InstanceConfig } from '../types/instance.js';
import type { Recipe } from '../types/recipe.js';
/**
 * Service for managing recipe instances (cook session configurations)
 */
export declare class RecipeInstanceService {
    private db;
    private recipeService;
    private unitConverter;
    constructor(db: Database);
    /**
     * Create a new recipe instance
     * Requirements: 18.1 - Create instance capturing exact configuration
     */
    createInstance(recipeId: string, config?: InstanceConfig): RecipeInstance;
    /**
     * Get a recipe instance by ID
     */
    getInstance(id: string): RecipeInstance | undefined;
    /**
     * Get all instances for a recipe
     */
    getInstancesForRecipe(recipeId: string): RecipeInstance[];
    /**
     * Load a recipe instance as a recipe with the instance's configuration applied
     * Requirements: 18.3 - Display recipe exactly as it was cooked
     * Requirements: 18.6 - Allow loading instance to restore exact configuration
     */
    loadInstanceAsRecipe(instanceId: string): Recipe;
    /**
     * Link an instance to a cook session
     */
    linkToCookSession(instanceId: string, cookSessionId: string): void;
    /**
     * Delete a recipe instance
     */
    deleteInstance(id: string): void;
    /**
     * Get the instance associated with a photo
     * Requirements: 17.3 - Navigate from photo to exact recipe configuration
     */
    getInstanceFromPhoto(photoId: string): RecipeInstance | undefined;
    /**
     * Get modifications for an instance
     */
    private getModifications;
    /**
     * Get photo IDs for an instance
     */
    private getPhotoIds;
}
//# sourceMappingURL=instance-service.d.ts.map