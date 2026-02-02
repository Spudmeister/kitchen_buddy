/**
 * Export Service - Handles recipe and data export/import
 *
 * Requirements: 8.2, 8.3, 9.3, 9.8, 9.9 - Export/import functionality
 */
import type { Database } from '../db/database.js';
import type { Recipe, Folder } from '../types/recipe.js';
import type { RecipeExport, FolderExport, FullExport, ExportOptions, ImportResult, ImportValidationError } from '../types/export.js';
/**
 * Service for exporting and importing recipe data
 */
export declare class ExportService {
    private db;
    private recipeService;
    private photoService;
    private statisticsService;
    private instanceService;
    private tagService;
    constructor(db: Database);
    /**
     * Export a single recipe
     * Requirements: 8.2 - Generate portable data file in app's format
     */
    exportRecipe(recipeId: string, options?: ExportOptions): RecipeExport;
    /**
     * Export all recipes in a folder
     * Requirements: 9.8 - Export all recipes in a folder as JSON
     */
    exportFolder(folderId: string, options?: ExportOptions): FolderExport;
    /**
     * Export all recipes and data
     */
    exportAll(options?: ExportOptions): FullExport;
    /**
     * Import recipes from exported data
     * Requirements: 8.3 - Import shared data file
     * Requirements: 9.9 - Parse JSON and store in SQLite
     */
    importRecipes(data: RecipeExport | FolderExport | FullExport): ImportResult;
    /**
     * Validate import data structure
     */
    validateImportData(data: RecipeExport): ImportValidationError[];
    /**
     * Convert a Recipe to ExportedRecipe format
     */
    private recipeToExported;
    /**
     * Get photos for a list of recipes
     */
    private getPhotosForRecipes;
    /**
     * Get cook sessions for a list of recipes
     */
    private getCookSessionsForRecipes;
    /**
     * Get ratings for a list of recipes
     */
    private getRatingsForRecipes;
    /**
     * Get instances for a list of recipes
     */
    private getInstancesForRecipes;
    /**
     * Import folders
     */
    private importFolders;
    /**
     * Import a single recipe
     * Returns the new recipe ID, or null if skipped
     */
    private importSingleRecipe;
    /**
     * Import a cook session
     */
    private importCookSession;
    /**
     * Import a rating
     */
    private importRating;
    /**
     * Import a recipe instance
     */
    private importInstance;
    /**
     * Import a photo
     */
    private importPhoto;
    /**
     * Get all recipes (for testing purposes)
     */
    getAllRecipes(): Recipe[];
    /**
     * Create a folder
     */
    createFolder(name: string, parentId?: string): Folder;
    /**
     * Move a recipe to a folder
     */
    moveToFolder(recipeId: string, folderId: string | null): void;
    /**
     * Get folder by ID
     */
    getFolder(folderId: string): Folder | undefined;
    /**
     * Get recipes in a folder
     */
    getRecipesInFolder(folderId: string): Recipe[];
}
//# sourceMappingURL=export-service.d.ts.map