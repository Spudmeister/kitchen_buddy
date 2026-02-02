/**
 * Recipe Service - Browser-adapted version for PWA
 * 
 * Provides CRUD operations with versioning support for recipes.
 * Adapted from the main Sous Chef service for browser environment.
 * 
 * Requirements: 1.4, 1.5
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserDatabase } from '@db/browser-database';
import type {
  Recipe,
  RecipeInput,
  RecipeVersion,
  RecipeHeritage,
  Ingredient,
  Instruction,
} from '@app-types/recipe';
import type { Unit } from '@app-types/units';
import type {
  RecipeFilters,
  RecipeSort,
  RecipeSearchParams,
  RecipeSearchResult,
} from '@app-types/search';

/**
 * Service for managing recipes with versioning support
 */
export class RecipeService {
  constructor(private db: BrowserDatabase) {}

  /**
   * Create a new recipe
   */
  async createRecipe(input: RecipeInput): Promise<Recipe> {
    const recipeId = uuidv4();
    const versionId = uuidv4();
    const now = new Date().toISOString();

    return this.db.transaction(() => {
      // Insert recipe record
      this.db.run(
        `INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, created_at)
         VALUES (?, 1, ?, ?, ?)`,
        [recipeId, input.folderId ?? null, input.parentRecipeId ?? null, now]
      );

      // Insert recipe version
      this.db.run(
        `INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          recipeId,
          input.title,
          input.description ?? null,
          input.prepTimeMinutes,
          input.cookTimeMinutes,
          input.servings,
          input.sourceUrl ?? null,
          now,
        ]
      );

      // Insert ingredients
      this.insertIngredients(versionId, input.ingredients);

      // Insert instructions
      this.insertInstructions(versionId, input.instructions);

      // Insert tags
      if (input.tags) {
        this.insertTags(recipeId, input.tags);
      }

      return this.getRecipe(recipeId)!;
    });
  }

  /**
   * Get a recipe by ID, optionally at a specific version
   */
  getRecipe(id: string, version?: number): Recipe | undefined {
    const recipeRow = this.db.get<
      [string, number, string | null, string | null, string | null, string]
    >(
      'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
      [id]
    );

    if (!recipeRow) {
      return undefined;
    }

    const [recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt] =
      recipeRow;
    const targetVersion = version ?? currentVersion;

    const versionRow = this.db.get<
      [string, string, string | null, number | null, number | null, number, string | null, string]
    >(
      `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
      [recipeId, targetVersion]
    );

    if (!versionRow) {
      return undefined;
    }

    const [
      versionId,
      title,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      sourceUrl,
      versionCreatedAt,
    ] = versionRow;

    const ingredients = this.getIngredients(versionId);
    const instructions = this.getInstructions(versionId);
    const tags = this.getTags(recipeId);

    const ratingRow = this.db.get<[number]>(
      'SELECT rating FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC LIMIT 1',
      [recipeId]
    );

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

  /**
   * Update a recipe - creates a new version while preserving history
   */
  async updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
    return this.db.transaction(() => {
      const recipeRow = this.db.get<[number]>(
        'SELECT current_version FROM recipes WHERE id = ?',
        [id]
      );

      if (!recipeRow) {
        throw new Error(`Recipe not found: ${id}`);
      }

      const newVersion = recipeRow[0] + 1;
      const versionId = uuidv4();
      const now = new Date().toISOString();

      this.db.run('UPDATE recipes SET current_version = ? WHERE id = ?', [newVersion, id]);

      this.db.run(
        `INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          id,
          newVersion,
          input.title,
          input.description ?? null,
          input.prepTimeMinutes,
          input.cookTimeMinutes,
          input.servings,
          input.sourceUrl ?? null,
          now,
        ]
      );

      this.insertIngredients(versionId, input.ingredients);
      this.insertInstructions(versionId, input.instructions);

      return this.getRecipe(id)!;
    });
  }

  /**
   * Archive (soft delete) a recipe
   */
  async archiveRecipe(id: string): Promise<void> {
    const now = new Date().toISOString();
    const result = this.db.run('UPDATE recipes SET archived_at = ? WHERE id = ?', [now, id]);
    if (result.changes === 0) {
      throw new Error(`Recipe not found: ${id}`);
    }
  }

  /**
   * Restore an archived recipe
   */
  async unarchiveRecipe(id: string): Promise<void> {
    const result = this.db.run('UPDATE recipes SET archived_at = NULL WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error(`Recipe not found: ${id}`);
    }
  }

  /**
   * Get version history for a recipe
   */
  getVersionHistory(id: string): RecipeVersion[] {
    const versionRows = this.db.exec(
      `SELECT id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? ORDER BY version ASC`,
      [id]
    );

    return versionRows.map((row) => {
      const versionId = row[0] as string;
      const ingredients = this.getIngredients(versionId);
      const instructions = this.getInstructions(versionId);

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
   * Restore a previous version - creates a new version with that content
   * Requirements: 6.4, 6.5
   */
  async restoreVersion(id: string, versionNumber: number): Promise<Recipe> {
    const versionToRestore = this.getRecipe(id, versionNumber);
    if (!versionToRestore) {
      throw new Error(`Version ${versionNumber} not found for recipe ${id}`);
    }

    // Create a new version with the content from the old version
    const input: RecipeInput = {
      title: versionToRestore.title,
      description: versionToRestore.description,
      ingredients: versionToRestore.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
        category: ing.category,
      })),
      instructions: versionToRestore.instructions.map((inst) => ({
        text: inst.text,
        durationMinutes: inst.duration?.minutes,
        notes: inst.notes,
      })),
      prepTimeMinutes: versionToRestore.prepTime.minutes,
      cookTimeMinutes: versionToRestore.cookTime.minutes,
      servings: versionToRestore.servings,
      sourceUrl: versionToRestore.sourceUrl,
    };

    return this.updateRecipe(id, input);
  }

  /**
   * Duplicate a recipe with heritage tracking
   */
  async duplicateRecipe(id: string): Promise<Recipe> {
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
      parentRecipeId: id,
    };

    return this.createRecipe(input);
  }

  /**
   * Get recipe heritage (parent, ancestors, children)
   */
  getRecipeHeritage(id: string): RecipeHeritage {
    const recipe = this.getRecipe(id);
    if (!recipe) {
      throw new Error(`Recipe not found: ${id}`);
    }

    let parent: Recipe | undefined;
    if (recipe.parentRecipeId) {
      parent = this.getRecipe(recipe.parentRecipeId);
    }

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
   * Search recipes
   */
  searchRecipes(query: string, limit: number = 50): Recipe[] {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const rows = this.db.exec(
      `SELECT DISTINCT r.id FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
       LEFT JOIN ingredients i ON rv.id = i.recipe_version_id
       LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
       LEFT JOIN tags t ON rt.tag_id = t.id
       WHERE r.archived_at IS NULL
       AND (LOWER(rv.title) LIKE ? OR LOWER(i.name) LIKE ? OR LOWER(t.name) LIKE ?)
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, limit]
    );

    return rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  /**
   * Advanced search with filtering, sorting, and pagination
   * Requirements: 3.2, 3.3, 3.4
   */
  advancedSearch(params: RecipeSearchParams = {}): RecipeSearchResult<Recipe> {
    const { filters = {}, sort, limit = 50, offset = 0 } = params;
    
    // Get all recipes first (we'll filter and sort in memory for simplicity)
    // This approach works well for personal recipe collections (typically < 1000 recipes)
    let recipes = this.getAllRecipesWithFilters(filters);
    
    // Apply sorting
    if (sort) {
      recipes = this.sortRecipes(recipes, sort);
    }
    
    const total = recipes.length;
    const hasMore = offset + limit < total;
    
    // Apply pagination
    const items = recipes.slice(offset, offset + limit);
    
    return { items, total, hasMore };
  }

  /**
   * Get all recipes matching filters
   */
  private getAllRecipesWithFilters(filters: RecipeFilters): Recipe[] {
    const { query, tags, minRating, maxCookTime, folderId, includeArchived } = filters;
    
    // Build base query
    let sql = `
      SELECT DISTINCT r.id FROM recipes r
      JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
    `;
    
    const conditions: string[] = [];
    const params: unknown[] = [];
    
    // Text search across title, ingredients, tags, and instructions
    if (query && query.trim()) {
      sql += `
        LEFT JOIN ingredients i ON rv.id = i.recipe_version_id
        LEFT JOIN instructions inst ON rv.id = inst.recipe_version_id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
      `;
      const searchTerm = `%${query.toLowerCase()}%`;
      conditions.push(`(
        LOWER(rv.title) LIKE ? OR 
        LOWER(i.name) LIKE ? OR 
        LOWER(t.name) LIKE ? OR
        LOWER(inst.text) LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Archive filter
    if (!includeArchived) {
      conditions.push('r.archived_at IS NULL');
    }
    
    // Folder filter
    if (folderId) {
      conditions.push('r.folder_id = ?');
      params.push(folderId);
    }
    
    // Build WHERE clause
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const rows = this.db.exec(sql, params);
    
    let recipes = rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
    
    // Apply in-memory filters that are complex to do in SQL
    
    // Tag filter (recipe must have ALL specified tags)
    if (tags && tags.length > 0) {
      recipes = recipes.filter(recipe => 
        tags.every(tag => 
          recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        )
      );
    }
    
    // Rating filter
    if (minRating !== undefined) {
      recipes = recipes.filter(recipe => 
        recipe.rating !== undefined && recipe.rating >= minRating
      );
    }
    
    // Cook time filter
    if (maxCookTime !== undefined) {
      recipes = recipes.filter(recipe => {
        const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
        return totalTime <= maxCookTime;
      });
    }
    
    return recipes;
  }

  /**
   * Sort recipes by specified field and direction
   */
  private sortRecipes(recipes: Recipe[], sort: RecipeSort): Recipe[] {
    const { field, direction } = sort;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    return [...recipes].sort((a, b) => {
      switch (field) {
        case 'name':
          return multiplier * a.title.localeCompare(b.title);
        
        case 'rating': {
          const ratingA = a.rating ?? 0;
          const ratingB = b.rating ?? 0;
          return multiplier * (ratingA - ratingB);
        }
        
        case 'date_added':
          return multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
        
        case 'last_cooked': {
          // For now, use updatedAt as proxy for last cooked
          // TODO: Integrate with cook sessions when available
          const timeA = a.updatedAt.getTime();
          const timeB = b.updatedAt.getTime();
          return multiplier * (timeA - timeB);
        }
        
        case 'cook_time': {
          const timeA = a.prepTime.minutes + a.cookTime.minutes;
          const timeB = b.prepTime.minutes + b.cookTime.minutes;
          return multiplier * (timeA - timeB);
        }
        
        default:
          return 0;
      }
    });
  }

  /**
   * Get all unique tags used in recipes
   */
  getAllTags(): string[] {
    const rows = this.db.exec('SELECT DISTINCT name FROM tags ORDER BY name');
    return rows.map(row => row[0] as string);
  }

  /**
   * Get all folders
   */
  getAllFolders(): { id: string; name: string; parentId?: string }[] {
    const rows = this.db.exec(
      'SELECT id, name, parent_id FROM folders ORDER BY name'
    );
    return rows.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      parentId: (row[2] as string | null) ?? undefined,
    }));
  }

  /**
   * Get all recipes (non-archived)
   */
  getAllRecipes(): Recipe[] {
    const rows = this.db.exec(
      'SELECT id FROM recipes WHERE archived_at IS NULL ORDER BY created_at DESC'
    );

    return rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  /**
   * Get all archived recipes
   * Requirements: 10.4
   */
  getArchivedRecipes(): Recipe[] {
    const rows = this.db.exec(
      'SELECT id FROM recipes WHERE archived_at IS NOT NULL ORDER BY archived_at DESC'
    );

    return rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  /**
   * Check if a recipe is archived
   */
  isArchived(id: string): boolean {
    const row = this.db.get<[string | null]>(
      'SELECT archived_at FROM recipes WHERE id = ?',
      [id]
    );
    return row !== undefined && row[0] !== null;
  }

  /**
   * Check if a recipe exists
   */
  exists(id: string): boolean {
    const row = this.db.get<[number]>('SELECT 1 FROM recipes WHERE id = ?', [id]);
    return row !== undefined;
  }

  // Private helper methods

  private insertIngredients(
    versionId: string,
    ingredients: RecipeInput['ingredients']
  ): void {
    ingredients.forEach((ing, index) => {
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
          index,
        ]
      );
    });
  }

  private insertInstructions(
    versionId: string,
    instructions: RecipeInput['instructions']
  ): void {
    instructions.forEach((inst, index) => {
      const instructionId = uuidv4();
      this.db.run(
        `INSERT INTO instructions (id, recipe_version_id, step_number, text, duration_minutes, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          instructionId,
          versionId,
          index + 1,
          inst.text,
          inst.durationMinutes ?? null,
          inst.notes ?? null,
        ]
      );
    });
  }

  private insertTags(recipeId: string, tags: string[]): void {
    for (const tagName of tags) {
      const existingTag = this.db.get<[string]>('SELECT id FROM tags WHERE name = ?', [
        tagName,
      ]);

      let tagId: string;
      if (existingTag) {
        tagId = existingTag[0];
      } else {
        tagId = uuidv4();
        this.db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
      }

      this.db.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [
        recipeId,
        tagId,
      ]);
    }
  }

  private getIngredients(versionId: string): Ingredient[] {
    const rows = this.db.exec(
      `SELECT id, name, quantity, unit, notes, category
       FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
      [versionId]
    );

    return rows.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      quantity: row[2] as number,
      unit: row[3] as Unit,
      notes: (row[4] as string | null) ?? undefined,
      category: (row[5] as Ingredient['category'] | null) ?? undefined,
    }));
  }

  private getInstructions(versionId: string): Instruction[] {
    const rows = this.db.exec(
      `SELECT id, step_number, text, duration_minutes, notes
       FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
      [versionId]
    );

    return rows.map((row) => ({
      id: row[0] as string,
      step: row[1] as number,
      text: row[2] as string,
      duration: row[3] != null ? { minutes: row[3] as number } : undefined,
      notes: (row[4] as string | null) ?? undefined,
    }));
  }

  private getTags(recipeId: string): string[] {
    const rows = this.db.exec(
      `SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`,
      [recipeId]
    );

    return rows.map((row) => row[0] as string);
  }
}
