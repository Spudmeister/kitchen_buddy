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
} from '../types/recipe.js';
import type { Unit } from '../types/units.js';

/**
 * Repository for recipe CRUD operations
 */
export class RecipeRepository {
  constructor(private db: Database) {}

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
      input.ingredients.forEach((ing, index) => {
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

      // Insert instructions
      input.instructions.forEach((inst, index) => {
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

      // Insert tags
      if (input.tags) {
        for (const tagName of input.tags) {
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
            [recipeId, tagId]
          );
        }
      }

      // Return the created recipe
      return this.getRecipe(recipeId)!;
    });
  }

  /**
   * Get a recipe by ID
   */
  getRecipe(id: string, version?: number): Recipe | undefined {
    // Get recipe metadata
    const recipeRow = this.db.get<[string, number, string | null, string | null, string | null, string]>(
      'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
      [id]
    );

    if (!recipeRow) {
      return undefined;
    }

    const [recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt] = recipeRow;
    const targetVersion = version ?? currentVersion;

    // Get version data
    const versionRow = this.db.get<[string, string, string | null, number | null, number | null, number, string | null, string]>(
      `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
      [recipeId, targetVersion]
    );

    if (!versionRow) {
      return undefined;
    }

    const [versionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, versionCreatedAt] = versionRow;

    // Get ingredients
    const ingredientRows = this.db.exec(
      `SELECT id, name, quantity, unit, notes, category
       FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
      [versionId]
    );

    const ingredients: Ingredient[] = ingredientRows.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      quantity: row[2] as number,
      unit: row[3] as Unit,
      notes: (row[4] as string | null) ?? undefined,
      category: (row[5] as Ingredient['category'] | null) ?? undefined,
    }));

    // Get instructions
    const instructionRows = this.db.exec(
      `SELECT id, step_number, text, duration_minutes, notes
       FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
      [versionId]
    );

    const instructions: Instruction[] = instructionRows.map((row) => ({
      id: row[0] as string,
      step: row[1] as number,
      text: row[2] as string,
      duration: row[3] != null ? { minutes: row[3] as number } : undefined,
      notes: (row[4] as string | null) ?? undefined,
    }));

    // Get tags
    const tagRows = this.db.exec(
      `SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?`,
      [recipeId]
    );

    const tags = tagRows.map((row) => row[0] as string);

    // Get rating (latest)
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
      input.ingredients.forEach((ing, index) => {
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

      // Insert instructions
      input.instructions.forEach((inst, index) => {
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

      return this.getRecipe(id)!;
    });
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
