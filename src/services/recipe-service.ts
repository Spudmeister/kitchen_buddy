/**
 * Recipe Service - Business logic for recipe management
 *
 * Provides CRUD operations with versioning support for recipes.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import { RecipeRepository } from '../repositories/recipe-repository.js';
import { SearchService } from './search-service.js';
import type {
  Recipe,
  RecipeInput,
  RecipeVersion,
  RecipeHeritage,
} from '../types/recipe.js';

/**
 * Service for managing recipes with versioning support
 */
export class RecipeService {
  private repository: RecipeRepository;
  private searchService: SearchService;

  constructor(private db: Database) {
    this.repository = new RecipeRepository(db);
    this.searchService = new SearchService(db);
  }

  /**
   * List all recipes
   */
  listRecipes(includeArchived: boolean = false): Recipe[] {
    return this.repository.listRecipes(includeArchived);
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string): Recipe[] {
    return this.searchService.searchRecipes(query);
  }

  /**
   * Create a new recipe
   * Requirements: 1.1 - Store recipe with all fields
   */
  createRecipe(input: RecipeInput): Recipe {
    const recipe = this.repository.createRecipe(input);
    this.searchService.indexRecipe(recipe.id);
    return recipe;
  }

  /**
   * Get a recipe by ID, optionally at a specific version
   */
  getRecipe(id: string, version?: number): Recipe | undefined {
    return this.repository.getRecipe(id, version);
  }

  /**
   * Update a recipe - creates a new version while preserving history
   * Requirements: 1.2 - Create new version on edit, preserve previous
   */
  updateRecipe(id: string, input: RecipeInput): Recipe {
    const recipe = this.repository.updateRecipe(id, input);
    this.searchService.indexRecipe(recipe.id);
    return recipe;
  }

  /**
   * Archive (soft delete) a recipe
   * Requirements: 1.4 - Mark as archived rather than permanently removing
   */
  archiveRecipe(id: string): void {
    this.repository.archiveRecipe(id);
    this.searchService.removeFromIndex(id);
  }

  /**
   * Restore an archived recipe to active state
   */
  unarchiveRecipe(id: string): void {
    this.repository.restoreRecipe(id);
    this.searchService.indexRecipe(id);
  }

  /**
   * Get version history for a recipe
   * Requirements: 1.3 - Display all versions with timestamps
   */
  getVersionHistory(id: string): RecipeVersion[] {
    const versionRows = this.db.exec(
      `SELECT id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? ORDER BY version ASC`,
      [id]
    );

    return versionRows.map((row) => {
      const versionId = row[0] as string;
      const ingredients = this.repository.getIngredients(versionId);
      const instructions = this.repository.getInstructions(versionId);

      return {
        id: versionId,
        recipeId: row[1] as string,
        version: row[2] as number,
        title: row[3] as string,
        description: (row[4] as string | null) ?? undefined,
        ingredients,
        instructions,
        prepTime: { minutes: (row[5] as number | null) ?? 0 },
        cookTime: { minutes: (row[6] as number | null) ?? 0 },
        servings: row[7] as number,
        sourceUrl: (row[8] as string | null) ?? undefined,
        createdAt: new Date(row[9] as string),
      };
    });
  }

  /**
   * Restore a recipe to a specific version
   * Requirements: 1.3 - Allow restoration of any version
   */
  restoreVersion(id: string, version: number): Recipe {
    // Get the version to restore
    const recipeAtVersion = this.repository.getRecipe(id, version);
    if (!recipeAtVersion) {
      throw new Error(`Version ${version} not found for recipe ${id}`);
    }

    // Create new version with restored data
    const input: RecipeInput = {
      title: recipeAtVersion.title,
      description: recipeAtVersion.description,
      ingredients: recipeAtVersion.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        category: ing.category,
      })),
      instructions: recipeAtVersion.instructions.map((inst) => ({
        text: inst.text,
        durationMinutes: inst.duration?.minutes,
        notes: inst.notes,
      })),
      prepTimeMinutes: recipeAtVersion.prepTime.minutes,
      cookTimeMinutes: recipeAtVersion.cookTime.minutes,
      servings: recipeAtVersion.servings,
      sourceUrl: recipeAtVersion.sourceUrl,
    };

    return this.updateRecipe(id, input);
  }

  /**
   * Duplicate a recipe with heritage tracking
   * Requirements: 1.10 - Create new recipe with reference to parent
   */
  duplicateRecipe(id: string): Recipe {
    const original = this.getRecipe(id);
    if (!original) {
      throw new Error(`Recipe not found: ${id}`);
    }

    const input: RecipeInput = {
      title: `${original.title} (Copy)`,
      description: original.description,
      ingredients: original.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        category: ing.category,
      })),
      instructions: original.instructions.map((inst) => ({
        text: inst.text,
        durationMinutes: inst.duration?.minutes,
        notes: inst.notes,
      })),
      prepTimeMinutes: original.prepTime.minutes,
      cookTimeMinutes: original.cookTime.minutes,
      servings: original.servings,
      tags: [...original.tags],
      sourceUrl: original.sourceUrl,
      folderId: original.folderId,
      parentRecipeId: id, // Link to parent
    };

    return this.createRecipe(input);
  }

  /**
   * Get recipe heritage (parent, ancestors, children)
   * Requirements: 1.11 - Display recipe heritage
   */
  getRecipeHeritage(id: string): RecipeHeritage {
    const recipe = this.getRecipe(id);
    if (!recipe) {
      throw new Error(`Recipe not found: ${id}`);
    }

    // Get parent
    let parent: Recipe | undefined;
    if (recipe.parentRecipeId) {
      parent = this.getRecipe(recipe.parentRecipeId);
    }

    // Get ancestors (traverse up the tree)
    const ancestors: Recipe[] = [];
    let currentParentId = recipe.parentRecipeId;
    while (currentParentId) {
      const ancestor = this.getRecipe(currentParentId);
      if (ancestor) {
        ancestors.push(ancestor);
        currentParentId = ancestor.parentRecipeId;
      } else {
        break;
      }
    }

    // Get children (recipes that have this recipe as parent)
    const childRows = this.db.exec(
      'SELECT id FROM recipes WHERE parent_recipe_id = ?',
      [id]
    );
    const children: Recipe[] = childRows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);

    return {
      recipe,
      parent,
      ancestors,
      children,
    };
  }

  /**
   * Check if a recipe exists
   */
  exists(id: string): boolean {
    const row = this.db.get<[number]>('SELECT 1 FROM recipes WHERE id = ?', [id]);
    return row !== undefined;
  }

  /**
   * Check if a recipe is archived
   */
  isArchived(id: string): boolean {
    const row = this.db.get<[string | null]>('SELECT archived_at FROM recipes WHERE id = ?', [id]);
    return row !== undefined && row[0] !== null;
  }
}
