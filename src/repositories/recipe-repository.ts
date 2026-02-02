/**
 * Recipe repository for database operations
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type {
  Recipe,
  RecipeInput,
  Ingredient,
  Instruction,
  RecipeVersion,
} from '../types/recipe.js';
import type { Unit } from '../types/units.js';

/**
 * Repository for recipe CRUD operations
 */
export class RecipeRepository {
  constructor(private db: Database) {}

  /**
   * List all recipes (non-archived by default)
   */
  listRecipes(includeArchived: boolean = false): Recipe[] {
    const sql = includeArchived
      ? 'SELECT id FROM recipes ORDER BY created_at DESC'
      : 'SELECT id FROM recipes WHERE archived_at IS NULL ORDER BY created_at DESC';

    const rows = this.db.exec(sql);
    return rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  /**
   * Create a new recipe
   */
  createRecipe(input: RecipeInput): Recipe {
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

      // Return the created recipe
      return this.getRecipe(recipeId)!;
    });
  }

  /**
   * Get a recipe by ID
   */
  getRecipe(id: string, version?: number): Recipe | undefined {
    // Optimized query to get recipe metadata and version data in one go
    // If version is not provided, we get the current_version
    const sql = version
      ? `SELECT r.id, r.current_version, r.folder_id, r.parent_recipe_id, r.archived_at, r.created_at,
                rv.id as version_id, rv.title, rv.description, rv.prep_time_minutes, rv.cook_time_minutes, rv.servings, rv.source_url, rv.created_at as version_created_at
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id
         WHERE r.id = ? AND rv.version = ?`
      : `SELECT r.id, r.current_version, r.folder_id, r.parent_recipe_id, r.archived_at, r.created_at,
                rv.id as version_id, rv.title, rv.description, rv.prep_time_minutes, rv.cook_time_minutes, rv.servings, rv.source_url, rv.created_at as version_created_at
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
         WHERE r.id = ?`;

    const params = version ? [id, version] : [id];
    const row = this.db.get<
      [string, number, string | null, string | null, string | null, string, string, string, string | null, number | null, number | null, number, string | null, string]
    >(sql, params);

    if (!row) {
      return undefined;
    }

    const [
      recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt,
      versionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, versionCreatedAt
    ] = row;

    // Get ingredients, instructions, tags, and rating (still separate for clarity and to avoid complex JOIN explosions)
    const ingredients = this.getIngredients(versionId);
    const instructions = this.getInstructions(versionId);
    const tags = this.getTags(recipeId);
    const rating = this.getRating(recipeId);

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
      rating,
      sourceUrl: sourceUrl ?? undefined,
      folderId: folderId ?? undefined,
      parentRecipeId: parentRecipeId ?? undefined,
      createdAt: new Date(createdAt),
      updatedAt: new Date(versionCreatedAt),
      archivedAt: archivedAt ? new Date(archivedAt) : undefined,
    };
  }

  /**
   * Get ingredients for a recipe version
   */
  getIngredients(versionId: string): Ingredient[] {
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

  /**
   * Get instructions for a recipe version
   */
  getInstructions(versionId: string): Instruction[] {
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

  /**
   * Get tags for a recipe
   */
  getTags(recipeId: string): string[] {
    const rows = this.db.exec(
      `SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`,
      [recipeId]
    );

    return rows.map((row) => row[0] as string);
  }

  /**
   * Get the latest rating for a recipe
   */
  getRating(recipeId: string): number | undefined {
    const row = this.db.get<[number]>(
      'SELECT rating FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC LIMIT 1',
      [recipeId]
    );
    return row?.[0];
  }

  /**
   * Update a recipe (creates a new version)
   */
  updateRecipe(id: string, input: RecipeInput): Recipe {
    return this.db.transaction(() => {
      // Get current version
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

      // Update recipe current version
      this.db.run(
        'UPDATE recipes SET current_version = ? WHERE id = ?',
        [newVersion, id]
      );

      // Insert new version
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

      // Insert ingredients
      this.insertIngredients(versionId, input.ingredients);

      // Insert instructions
      this.insertInstructions(versionId, input.instructions);

      return this.getRecipe(id)!;
    });
  }

  /**
   * Helper to insert ingredients
   */
  private insertIngredients(versionId: string, ingredients: Ingredient[] | RecipeInput['ingredients']): void {
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

  /**
   * Helper to insert instructions
   */
  private insertInstructions(versionId: string, instructions: Instruction[] | RecipeInput['instructions']): void {
    instructions.forEach((inst, index) => {
      const instructionId = uuidv4();
      this.db.run(
        `INSERT INTO instructions (id, recipe_version_id, step_number, text, duration_minutes, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          instructionId,
          versionId,
          (inst as Instruction).step || index + 1,
          inst.text,
          (inst as Instruction).duration?.minutes ?? (inst as RecipeInput['instructions'][0]).durationMinutes ?? null,
          inst.notes ?? null,
        ]
      );
    });
  }

  /**
   * Helper to insert tags
   */
  private insertTags(recipeId: string, tags: string[]): void {
    for (const tagName of tags) {
      // Get or create tag
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

      // Associate tag with recipe
      this.db.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [
        recipeId,
        tagId,
      ]);
    }
  }

  /**
   * Archive (soft delete) a recipe
   */
  archiveRecipe(id: string): void {
    const now = new Date().toISOString();
    this.db.run('UPDATE recipes SET archived_at = ? WHERE id = ?', [now, id]);
  }

  /**
   * Restore an archived recipe
   */
  restoreRecipe(id: string): void {
    this.db.run('UPDATE recipes SET archived_at = NULL WHERE id = ?', [id]);
  }
}
