/**
 * Recipe Service - Business logic for recipe management
 *
 * Provides CRUD operations with versioning support for recipes.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type {
  Recipe,
  RecipeInput,
  RecipeVersion,
  RecipeHeritage,
  Ingredient,
  Instruction,
} from '../types/recipe.js';
import type { Unit } from '../types/units.js';

/**
 * Service for managing recipes with versioning support
 */
export class RecipeService {
  constructor(private db: Database) {}

  /**
   * Create a new recipe
   * Requirements: 1.1 - Store recipe with all fields
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

      return this.getRecipe(recipeId)!;
    });
  }

  /**
   * Get a recipe by ID, optionally at a specific version
   */
  getRecipe(id: string, version?: number): Recipe | undefined {
    // Get recipe metadata
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

    // Get version data
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

    // Get ingredients
    const ingredients = this.getIngredients(versionId);

    // Get instructions
    const instructions = this.getInstructions(versionId);

    // Get tags
    const tags = this.getTags(recipeId);

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
   * Update a recipe - creates a new version while preserving history
   * Requirements: 1.2 - Create new version on edit, preserve previous
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
      this.db.run('UPDATE recipes SET current_version = ? WHERE id = ?', [newVersion, id]);

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

      // Insert ingredients for new version
      this.insertIngredients(versionId, input.ingredients);

      // Insert instructions for new version
      this.insertInstructions(versionId, input.instructions);

      return this.getRecipe(id)!;
    });
  }

  /**
   * Archive (soft delete) a recipe
   * Requirements: 1.4 - Mark as archived rather than permanently removing
   */
  archiveRecipe(id: string): void {
    const now = new Date().toISOString();
    const result = this.db.run('UPDATE recipes SET archived_at = ? WHERE id = ?', [now, id]);
    if (result.changes === 0) {
      throw new Error(`Recipe not found: ${id}`);
    }
  }

  /**
   * Restore an archived recipe to active state
   */
  unarchiveRecipe(id: string): void {
    const result = this.db.run('UPDATE recipes SET archived_at = NULL WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error(`Recipe not found: ${id}`);
    }
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
   * Restore a recipe to a specific version
   * Requirements: 1.3 - Allow restoration of any version
   */
  restoreVersion(id: string, version: number): Recipe {
    // Get the version to restore (outside transaction since updateRecipeInternal handles its own)
    const versionRow = this.db.get<
      [string, string, string | null, number | null, number | null, number, string | null]
    >(
      `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
      [id, version]
    );

    if (!versionRow) {
      throw new Error(`Version ${version} not found for recipe ${id}`);
    }

    const [oldVersionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl] =
      versionRow;

    // Get ingredients from old version
    const ingredientRows = this.db.exec(
      `SELECT name, quantity, unit, notes, category FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
      [oldVersionId]
    );

    // Get instructions from old version
    const instructionRows = this.db.exec(
      `SELECT text, duration_minutes, notes FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
      [oldVersionId]
    );

    // Create new version with restored data
    const input: RecipeInput = {
      title,
      description: description ?? undefined,
      ingredients: ingredientRows.map((row) => ({
        name: row[0] as string,
        quantity: row[1] as number,
        unit: row[2] as Unit,
        notes: (row[3] as string | null) ?? undefined,
        category: (row[4] as Ingredient['category'] | null) ?? undefined,
      })),
      instructions: instructionRows.map((row) => ({
        text: row[0] as string,
        durationMinutes: (row[1] as number | null) ?? undefined,
        notes: (row[2] as string | null) ?? undefined,
      })),
      prepTimeMinutes: prepTimeMinutes ?? 0,
      cookTimeMinutes: cookTimeMinutes ?? 0,
      servings,
      sourceUrl: sourceUrl ?? undefined,
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
    const row = this.db.get<[string | null]>(
      'SELECT archived_at FROM recipes WHERE id = ?',
      [id]
    );
    return row !== undefined && row[0] !== null;
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
