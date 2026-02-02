/**
 * Export Service - Handles recipe and data export/import
 *
 * Requirements: 8.2, 8.3, 9.3, 9.8, 9.9 - Export/import functionality
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { Recipe, Folder } from '../types/recipe.js';
import { RecipeRepository } from '../repositories/recipe-repository.js';
import type {
  RecipeExport,
  FolderExport,
  FullExport,
  ExportOptions,
  ExportedRecipe,
  ExportedPhoto,
  ExportedCookSession,
  ExportedRating,
  ExportedInstance,
  ExportedFolder,
  ImportResult,
  ImportValidationError,
} from '../types/export.js';
import { EXPORT_FORMAT_VERSION } from '../types/export.js';
import { PhotoService } from './photo-service.js';
import { StatisticsService } from './statistics-service.js';
import { RecipeInstanceService } from './instance-service.js';
import { TagService } from './tag-service.js';

/**
 * Service for exporting and importing recipe data
 */
export class ExportService {
  private repository: RecipeRepository;
  private photoService: PhotoService;
  private statisticsService: StatisticsService;
  private instanceService: RecipeInstanceService;
  private tagService: TagService;

  constructor(private db: Database) {
    this.repository = new RecipeRepository(db);
    this.photoService = new PhotoService(db);
    this.statisticsService = new StatisticsService(db);
    this.instanceService = new RecipeInstanceService(db);
    this.tagService = new TagService(db);
  }

  /**
   * Export a single recipe
   * Requirements: 8.2 - Generate portable data file in app's format
   */
  exportRecipe(recipeId: string, options: ExportOptions = {}): RecipeExport {
    const recipe = this.repository.getRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const exportedRecipes = [this.recipeToExported(recipe)];
    const result: RecipeExport = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      recipes: exportedRecipes,
    };

    // Include photos if requested
    if (options.includePhotos) {
      result.photos = this.getPhotosForRecipes([recipeId]);
    }

    // Include cook sessions if requested
    if (options.includeCookSessions) {
      result.cookSessions = this.getCookSessionsForRecipes([recipeId]);
    }

    // Include ratings if requested
    if (options.includeRatings) {
      result.ratings = this.getRatingsForRecipes([recipeId]);
    }

    // Include instances if requested
    if (options.includeInstances) {
      result.instances = this.getInstancesForRecipes([recipeId]);
    }

    return result;
  }

  /**
   * Export all recipes in a folder
   * Requirements: 9.8 - Export all recipes in a folder as JSON
   */
  exportFolder(folderId: string, options: ExportOptions = {}): FolderExport {
    // Get folder info
    const folderRow = this.db.get<[string, string, string | null, string]>(
      'SELECT id, name, parent_id, created_at FROM folders WHERE id = ?',
      [folderId]
    );

    if (!folderRow) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    const [id, name, parentId, createdAt] = folderRow;
    const folder: ExportedFolder = {
      id,
      name,
      parentId: parentId ?? undefined,
      createdAt,
    };

    // Get all recipes in the folder
    const recipeRows = this.db.exec(
      'SELECT id FROM recipes WHERE folder_id = ? AND archived_at IS NULL',
      [folderId]
    );

    const recipeIds = recipeRows.map(row => row[0] as string);
    const exportedRecipes = recipeIds
      .map(rid => this.repository.getRecipe(rid))
      .filter((r): r is Recipe => r !== undefined)
      .map(r => this.recipeToExported(r));

    const result: FolderExport = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      recipes: exportedRecipes,
      folder,
    };

    // Include photos if requested
    if (options.includePhotos) {
      result.photos = this.getPhotosForRecipes(recipeIds);
    }

    // Include cook sessions if requested
    if (options.includeCookSessions) {
      result.cookSessions = this.getCookSessionsForRecipes(recipeIds);
    }

    // Include ratings if requested
    if (options.includeRatings) {
      result.ratings = this.getRatingsForRecipes(recipeIds);
    }

    // Include instances if requested
    if (options.includeInstances) {
      result.instances = this.getInstancesForRecipes(recipeIds);
    }

    return result;
  }

  /**
   * Export all recipes and data
   */
  exportAll(options: ExportOptions = {}): FullExport {
    // Get all non-archived recipes
    const recipeRows = this.db.exec(
      'SELECT id FROM recipes WHERE archived_at IS NULL'
    );

    const recipeIds = recipeRows.map(row => row[0] as string);
    const exportedRecipes = recipeIds
      .map(rid => this.repository.getRecipe(rid))
      .filter((r): r is Recipe => r !== undefined)
      .map(r => this.recipeToExported(r));

    // Get all folders
    const folderRows = this.db.exec(
      'SELECT id, name, parent_id, created_at FROM folders'
    );
    const folders: ExportedFolder[] = folderRows.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      parentId: (row[2] as string | null) ?? undefined,
      createdAt: row[3] as string,
    }));

    const result: FullExport = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      recipes: exportedRecipes,
      folders: folders.length > 0 ? folders : undefined,
    };

    // Include photos if requested
    if (options.includePhotos) {
      result.photos = this.getPhotosForRecipes(recipeIds);
    }

    // Include cook sessions if requested
    if (options.includeCookSessions) {
      result.cookSessions = this.getCookSessionsForRecipes(recipeIds);
    }

    // Include ratings if requested
    if (options.includeRatings) {
      result.ratings = this.getRatingsForRecipes(recipeIds);
    }

    // Include instances if requested
    if (options.includeInstances) {
      result.instances = this.getInstancesForRecipes(recipeIds);
    }

    return result;
  }


  /**
   * Import recipes from exported data
   * Requirements: 8.3 - Import shared data file
   * Requirements: 9.9 - Parse JSON and store in SQLite
   */
  importRecipes(data: RecipeExport | FolderExport | FullExport): ImportResult {
    const result: ImportResult = {
      recipesImported: 0,
      recipesSkipped: 0,
      photosImported: 0,
      cookSessionsImported: 0,
      ratingsImported: 0,
      instancesImported: 0,
      errors: [],
      importedRecipeIds: [],
    };

    // Validate the import data
    const validationErrors = this.validateImportData(data);
    if (validationErrors.length > 0) {
      result.errors = validationErrors.map(e => `${e.field}: ${e.message}`);
      return result;
    }

    // Import folders first (if present in FullExport)
    if ('folders' in data && data.folders) {
      this.importFolders(data.folders, result);
    }

    // Import folder (if present in FolderExport)
    if ('folder' in data && data.folder) {
      this.importFolders([data.folder], result);
    }

    // Build a map of old recipe IDs to new recipe IDs
    const recipeIdMap = new Map<string, string>();

    // Import recipes
    for (let i = 0; i < data.recipes.length; i++) {
      const exportedRecipe = data.recipes[i];
      if (!exportedRecipe) {
        result.errors.push(`Recipe ${i}: Recipe data is undefined`);
        continue;
      }
      try {
        const newRecipeId = this.importSingleRecipe(exportedRecipe, recipeIdMap);
        if (newRecipeId) {
          recipeIdMap.set(exportedRecipe.id, newRecipeId);
          result.recipesImported++;
          result.importedRecipeIds.push(newRecipeId);
        } else {
          result.recipesSkipped++;
        }
      } catch (error) {
        result.errors.push(`Recipe ${i} (${exportedRecipe.title}): ${(error as Error).message}`);
      }
    }

    // Import instances (before cook sessions since sessions may reference them)
    if (data.instances) {
      for (const instance of data.instances) {
        try {
          const newRecipeId = recipeIdMap.get(instance.recipeId);
          if (newRecipeId) {
            this.importInstance(instance, newRecipeId);
            result.instancesImported++;
          }
        } catch (error) {
          result.errors.push(`Instance ${instance.id}: ${(error as Error).message}`);
        }
      }
    }

    // Import cook sessions
    if (data.cookSessions) {
      for (const session of data.cookSessions) {
        try {
          const newRecipeId = recipeIdMap.get(session.recipeId);
          if (newRecipeId) {
            this.importCookSession(session, newRecipeId);
            result.cookSessionsImported++;
          }
        } catch (error) {
          result.errors.push(`Cook session ${session.id}: ${(error as Error).message}`);
        }
      }
    }

    // Import ratings
    if (data.ratings) {
      for (const rating of data.ratings) {
        try {
          const newRecipeId = recipeIdMap.get(rating.recipeId);
          if (newRecipeId) {
            this.importRating(rating, newRecipeId);
            result.ratingsImported++;
          }
        } catch (error) {
          result.errors.push(`Rating ${rating.id}: ${(error as Error).message}`);
        }
      }
    }

    // Import photos
    if (data.photos) {
      for (const photo of data.photos) {
        try {
          const newRecipeId = recipeIdMap.get(photo.recipeId);
          if (newRecipeId) {
            this.importPhoto(photo, newRecipeId);
            result.photosImported++;
          }
        } catch (error) {
          result.errors.push(`Photo ${photo.id}: ${(error as Error).message}`);
        }
      }
    }

    return result;
  }

  /**
   * Validate import data structure
   */
  validateImportData(data: RecipeExport): ImportValidationError[] {
    const errors: ImportValidationError[] = [];

    // Check version
    if (!data.version) {
      errors.push({ field: 'version', message: 'Missing version field' });
    }

    // Check recipes array
    if (!Array.isArray(data.recipes)) {
      errors.push({ field: 'recipes', message: 'Recipes must be an array' });
      return errors;
    }

    // Validate each recipe
    for (let i = 0; i < data.recipes.length; i++) {
      const recipe = data.recipes[i];
      if (!recipe) {
        errors.push({ field: 'recipes', message: `Recipe at index ${i} is undefined`, recipeIndex: i });
        continue;
      }
      
      if (!recipe.title || typeof recipe.title !== 'string') {
        errors.push({ field: 'title', message: 'Missing or invalid title', recipeIndex: i });
      }

      if (!Array.isArray(recipe.ingredients)) {
        errors.push({ field: 'ingredients', message: 'Ingredients must be an array', recipeIndex: i });
      }

      if (!Array.isArray(recipe.instructions)) {
        errors.push({ field: 'instructions', message: 'Instructions must be an array', recipeIndex: i });
      }

      if (typeof recipe.servings !== 'number' || recipe.servings < 1) {
        errors.push({ field: 'servings', message: 'Servings must be a positive number', recipeIndex: i });
      }
    }

    return errors;
  }

  // ==================== Private Helper Methods ====================

  /**
   * Convert a Recipe to ExportedRecipe format
   */
  private recipeToExported(recipe: Recipe): ExportedRecipe {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        category: ing.category,
      })),
      instructions: recipe.instructions.map(inst => ({
        step: inst.step,
        text: inst.text,
        durationMinutes: inst.duration?.minutes,
        notes: inst.notes,
      })),
      prepTimeMinutes: recipe.prepTime.minutes,
      cookTimeMinutes: recipe.cookTime.minutes,
      servings: recipe.servings,
      tags: recipe.tags,
      rating: recipe.rating,
      sourceUrl: recipe.sourceUrl,
      parentRecipeId: recipe.parentRecipeId,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };
  }

  /**
   * Get photos for a list of recipes
   */
  private getPhotosForRecipes(recipeIds: string[]): ExportedPhoto[] {
    const photos: ExportedPhoto[] = [];
    
    for (const recipeId of recipeIds) {
      const recipePhotos = this.photoService.getPhotos(recipeId);
      for (const photo of recipePhotos) {
        photos.push({
          id: photo.id,
          recipeId: photo.recipeId,
          instanceId: photo.instanceId,
          filename: photo.filename,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
          takenAt: photo.takenAt?.toISOString(),
          metadata: photo.metadata,
          createdAt: photo.createdAt.toISOString(),
          // Note: In a real implementation, we would read the file and base64 encode it
          // data: readFileAsBase64(photo.filePath),
        });
      }
    }

    return photos;
  }

  /**
   * Get cook sessions for a list of recipes
   */
  private getCookSessionsForRecipes(recipeIds: string[]): ExportedCookSession[] {
    const sessions: ExportedCookSession[] = [];

    for (const recipeId of recipeIds) {
      const recipeSessions = this.statisticsService.getCookSessionsForRecipe(recipeId);
      for (const session of recipeSessions) {
        sessions.push({
          id: session.id,
          recipeId: session.recipeId,
          date: session.date.toISOString(),
          actualPrepMinutes: session.actualPrepTime?.minutes,
          actualCookMinutes: session.actualCookTime?.minutes,
          servingsMade: session.servingsMade,
          notes: session.notes,
          instanceId: session.instanceId,
        });
      }
    }

    return sessions;
  }

  /**
   * Get ratings for a list of recipes
   */
  private getRatingsForRecipes(recipeIds: string[]): ExportedRating[] {
    const ratings: ExportedRating[] = [];

    for (const recipeId of recipeIds) {
      const recipeRatings = this.statisticsService.getRatingHistory(recipeId);
      for (const rating of recipeRatings) {
        ratings.push({
          id: rating.id,
          recipeId: rating.recipeId,
          rating: rating.rating,
          ratedAt: rating.ratedAt.toISOString(),
        });
      }
    }

    return ratings;
  }

  /**
   * Get instances for a list of recipes
   */
  private getInstancesForRecipes(recipeIds: string[]): ExportedInstance[] {
    const instances: ExportedInstance[] = [];

    for (const recipeId of recipeIds) {
      const recipeInstances = this.instanceService.getInstancesForRecipe(recipeId);
      for (const instance of recipeInstances) {
        instances.push({
          id: instance.id,
          recipeId: instance.recipeId,
          recipeVersion: instance.recipeVersion,
          cookSessionId: instance.cookSessionId,
          scaleFactor: instance.scaleFactor,
          unitSystem: instance.unitSystem,
          servings: instance.servings,
          notes: instance.notes,
          modifications: instance.modifications,
          createdAt: instance.createdAt.toISOString(),
        });
      }
    }

    return instances;
  }


  /**
   * Import folders
   */
  private importFolders(folders: ExportedFolder[], result: ImportResult): void {
    for (const folder of folders) {
      try {
        // Check if folder already exists
        const existing = this.db.get<[string]>(
          'SELECT id FROM folders WHERE id = ?',
          [folder.id]
        );

        if (!existing) {
          this.db.run(
            'INSERT INTO folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)',
            [folder.id, folder.name, folder.parentId ?? null, folder.createdAt]
          );
        }
      } catch (error) {
        result.errors.push(`Folder ${folder.name}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Import a single recipe
   * Returns the new recipe ID, or null if skipped
   */
  private importSingleRecipe(
    exported: ExportedRecipe,
    recipeIdMap: Map<string, string>
  ): string | null {
    // Generate a new ID for the imported recipe
    const newRecipeId = uuidv4();
    const versionId = uuidv4();
    const now = new Date().toISOString();

    // Resolve parent recipe ID if present
    let parentRecipeId: string | null = null;
    if (exported.parentRecipeId) {
      parentRecipeId = recipeIdMap.get(exported.parentRecipeId) ?? null;
    }

    return this.db.transaction(() => {
      // Insert recipe record
      this.db.run(
        `INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, created_at)
         VALUES (?, 1, ?, ?, ?)`,
        [newRecipeId, null, parentRecipeId, exported.createdAt || now]
      );

      // Insert recipe version
      this.db.run(
        `INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          newRecipeId,
          exported.title,
          exported.description ?? null,
          exported.prepTimeMinutes ?? 0,
          exported.cookTimeMinutes ?? 0,
          exported.servings,
          exported.sourceUrl ?? null,
          exported.updatedAt || now,
        ]
      );

      // Insert ingredients
      for (let i = 0; i < exported.ingredients.length; i++) {
        const ing = exported.ingredients[i];
        if (!ing) continue;
        const ingredientId = uuidv4();
        this.db.run(
          `INSERT INTO ingredients (id, recipe_version_id, name, quantity, unit, notes, category, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ingredientId,
            versionId,
            ing.name,
            ing.quantity,
            ing.unit,
            ing.notes ?? null,
            ing.category ?? null,
            i,
          ]
        );
      }

      // Insert instructions
      for (let i = 0; i < exported.instructions.length; i++) {
        const inst = exported.instructions[i];
        if (!inst) continue;
        const instructionId = uuidv4();
        this.db.run(
          `INSERT INTO instructions (id, recipe_version_id, step_number, text, duration_minutes, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            instructionId,
            versionId,
            inst.step || i + 1,
            inst.text,
            inst.durationMinutes ?? null,
            inst.notes ?? null,
          ]
        );
      }

      // Insert tags
      if (exported.tags && exported.tags.length > 0) {
        for (const tagName of exported.tags) {
          // Get or create tag
          const existingTag = this.db.get<[string]>(
            'SELECT id FROM tags WHERE name = ?',
            [tagName]
          );

          let tagId: string;
          if (existingTag) {
            tagId = existingTag[0];
          } else {
            tagId = uuidv4();
            this.db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
          }

          // Associate tag with recipe
          this.db.run(
            'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
            [newRecipeId, tagId]
          );
        }
      }

      // Import rating if present
      if (exported.rating !== undefined && exported.rating >= 1 && exported.rating <= 5) {
        const ratingId = uuidv4();
        this.db.run(
          'INSERT INTO ratings (id, recipe_id, rating, rated_at) VALUES (?, ?, ?, ?)',
          [ratingId, newRecipeId, exported.rating, now]
        );
      }

      return newRecipeId;
    });
  }

  /**
   * Import a cook session
   */
  private importCookSession(session: ExportedCookSession, newRecipeId: string): void {
    const sessionId = uuidv4();
    this.db.run(
      `INSERT INTO cook_sessions (id, recipe_id, instance_id, date, actual_prep_minutes, actual_cook_minutes, servings_made, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        newRecipeId,
        null, // Instance ID mapping would need to be handled separately
        session.date,
        session.actualPrepMinutes ?? null,
        session.actualCookMinutes ?? null,
        session.servingsMade,
        session.notes ?? null,
      ]
    );
  }

  /**
   * Import a rating
   */
  private importRating(rating: ExportedRating, newRecipeId: string): void {
    const ratingId = uuidv4();
    this.db.run(
      'INSERT INTO ratings (id, recipe_id, rating, rated_at) VALUES (?, ?, ?, ?)',
      [ratingId, newRecipeId, rating.rating, rating.ratedAt]
    );
  }

  /**
   * Import a recipe instance
   */
  private importInstance(instance: ExportedInstance, newRecipeId: string): void {
    const instanceId = uuidv4();
    this.db.run(
      `INSERT INTO recipe_instances (id, recipe_id, recipe_version, cook_session_id, scale_factor, unit_system, servings, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instanceId,
        newRecipeId,
        instance.recipeVersion,
        null, // Cook session ID mapping would need to be handled separately
        instance.scaleFactor,
        instance.unitSystem,
        instance.servings,
        instance.notes ?? null,
        instance.createdAt,
      ]
    );

    // Import modifications
    if (instance.modifications && instance.modifications.length > 0) {
      for (const mod of instance.modifications) {
        const modId = uuidv4();
        this.db.run(
          `INSERT INTO instance_modifications (id, instance_id, ingredient_index, original_quantity, modified_quantity, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            modId,
            instanceId,
            mod.ingredientIndex,
            mod.originalQuantity,
            mod.modifiedQuantity,
            mod.note ?? null,
          ]
        );
      }
    }
  }

  /**
   * Import a photo
   */
  private importPhoto(photo: ExportedPhoto, newRecipeId: string): void {
    const photoId = uuidv4();
    const filePath = `photos/${newRecipeId}/${photoId}_${photo.filename}`;

    this.db.run(
      `INSERT INTO photos (id, recipe_id, instance_id, filename, mime_type, width, height, file_path, taken_at, caption, step_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photoId,
        newRecipeId,
        null, // Instance ID mapping would need to be handled separately
        photo.filename,
        photo.mimeType,
        photo.width ?? null,
        photo.height ?? null,
        filePath,
        photo.takenAt ?? null,
        photo.metadata?.caption ?? null,
        photo.metadata?.step ?? null,
        photo.createdAt,
      ]
    );

    // Note: In a real implementation, we would also write the photo data to the file system
    // if (photo.data) {
    //   writeBase64ToFile(filePath, photo.data);
    // }
  }

  /**
   * Get all recipes (for testing purposes)
   */
  getAllRecipes(): Recipe[] {
    return this.repository.listRecipes();
  }

  /**
   * Create a folder
   */
  createFolder(name: string, parentId?: string): Folder {
    const folderId = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      'INSERT INTO folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)',
      [folderId, name, parentId ?? null, now]
    );

    return {
      id: folderId,
      name,
      parentId,
      createdAt: new Date(now),
    };
  }

  /**
   * Move a recipe to a folder
   */
  moveToFolder(recipeId: string, folderId: string | null): void {
    const result = this.db.run(
      'UPDATE recipes SET folder_id = ? WHERE id = ?',
      [folderId, recipeId]
    );

    if (result.changes === 0) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }
  }

  /**
   * Get folder by ID
   */
  getFolder(folderId: string): Folder | undefined {
    const row = this.db.get<[string, string, string | null, string]>(
      'SELECT id, name, parent_id, created_at FROM folders WHERE id = ?',
      [folderId]
    );

    if (!row) {
      return undefined;
    }

    return {
      id: row[0],
      name: row[1],
      parentId: row[2] ?? undefined,
      createdAt: new Date(row[3]),
    };
  }

  /**
   * Get recipes in a folder
   */
  getRecipesInFolder(folderId: string): Recipe[] {
    const recipeRows = this.db.exec(
      'SELECT id FROM recipes WHERE folder_id = ? AND archived_at IS NULL',
      [folderId]
    );

    return recipeRows
      .map(row => this.repository.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }
}
