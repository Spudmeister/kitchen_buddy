/**
 * Property Test: Recipe Versioning Integrity
 *
 * **Feature: sous-chef-pwa, Property 3: Recipe Versioning Integrity**
 * **Validates: Requirements 6.4, 6.5**
 *
 * For any recipe edit operation, a new version SHALL be created while preserving
 * all previous versions. The version count SHALL equal the number of edits plus
 * one (original). Restoring a version SHALL create a new version with that content.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import { minimalRecipeInputArb } from '../generators/recipe-generators';
import type { RecipeInput, RecipeVersion } from '../../src/types/recipe';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test database implementation
 */
class TestDatabase {
  private db: SqlJsDatabase | null = null;

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
    this.applySchema();
  }

  private applySchema(): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(CREATE_TABLES_SQL);
    this.db.run(CREATE_INDEXES_SQL);
    this.db.run(
      'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, datetime("now"))',
      [SCHEMA_VERSION]
    );
  }

  exec(sql: string, params: unknown[] = []): unknown[][] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: unknown[][] = [];
    while (stmt.step()) {
      results.push(stmt.get());
    }
    stmt.free();
    return results;
  }

  get<T = unknown[]>(sql: string, params: unknown[] = []): T | undefined {
    const results = this.exec(sql, params);
    return results[0] as T | undefined;
  }

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    const changesResult = this.db.exec('SELECT changes()');
    const lastIdResult = this.db.exec('SELECT last_insert_rowid()');
    const changes = changesResult[0]?.values[0]?.[0];
    const lastId = lastIdResult[0]?.values[0]?.[0];
    return {
      changes: typeof changes === 'number' ? changes : 0,
      lastInsertRowid: typeof lastId === 'number' ? lastId : 0,
    };
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create a recipe in the database
 */
function createRecipe(db: TestDatabase, input: RecipeInput): string {
  const recipeId = uuidv4();
  const versionId = uuidv4();
  const now = new Date().toISOString();

  return db.transaction(() => {
    db.run(
      `INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, created_at)
       VALUES (?, 1, ?, ?, ?)`,
      [recipeId, input.folderId ?? null, input.parentRecipeId ?? null, now]
    );

    db.run(
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

    input.ingredients.forEach((ing, index) => {
      const ingredientId = uuidv4();
      db.run(
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

    input.instructions.forEach((inst, index) => {
      const instructionId = uuidv4();
      db.run(
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

    return recipeId;
  });
}

/**
 * Update a recipe - creates a new version
 */
function updateRecipe(db: TestDatabase, recipeId: string, input: RecipeInput): number {
  return db.transaction(() => {
    const recipeRow = db.get<[number]>(
      'SELECT current_version FROM recipes WHERE id = ?',
      [recipeId]
    );

    if (!recipeRow) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const newVersion = recipeRow[0] + 1;
    const versionId = uuidv4();
    const now = new Date().toISOString();

    db.run('UPDATE recipes SET current_version = ? WHERE id = ?', [newVersion, recipeId]);

    db.run(
      `INSERT INTO recipe_versions (id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        versionId,
        recipeId,
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

    input.ingredients.forEach((ing, index) => {
      const ingredientId = uuidv4();
      db.run(
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

    input.instructions.forEach((inst, index) => {
      const instructionId = uuidv4();
      db.run(
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

    return newVersion;
  });
}

/**
 * Get version history for a recipe
 */
function getVersionHistory(db: TestDatabase, recipeId: string): RecipeVersion[] {
  const versionRows = db.exec(
    `SELECT id, recipe_id, version, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
     FROM recipe_versions WHERE recipe_id = ? ORDER BY version ASC`,
    [recipeId]
  );

  return versionRows.map((row) => {
    const versionId = row[0] as string;

    const ingredientRows = db.exec(
      `SELECT id, name, quantity, unit, notes, category FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
      [versionId]
    );

    const instructionRows = db.exec(
      `SELECT id, step_number, text, duration_minutes, notes FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
      [versionId]
    );

    return {
      id: versionId,
      recipeId: row[1] as string,
      version: row[2] as number,
      title: row[3] as string,
      description: (row[4] as string | null) ?? undefined,
      ingredients: ingredientRows.map((ingRow) => ({
        id: ingRow[0] as string,
        name: ingRow[1] as string,
        quantity: ingRow[2] as number,
        unit: ingRow[3] as RecipeInput['ingredients'][0]['unit'],
        notes: (ingRow[4] as string | null) ?? undefined,
        category: (ingRow[5] as RecipeInput['ingredients'][0]['category'] | null) ?? undefined,
      })),
      instructions: instructionRows.map((instRow) => ({
        id: instRow[0] as string,
        step: instRow[1] as number,
        text: instRow[2] as string,
        duration: instRow[3] != null ? { minutes: instRow[3] as number } : undefined,
        notes: (instRow[4] as string | null) ?? undefined,
      })),
      prepTime: { minutes: (row[5] as number | null) ?? 0 },
      cookTime: { minutes: (row[6] as number | null) ?? 0 },
      servings: row[7] as number,
      sourceUrl: (row[8] as string | null) ?? undefined,
      createdAt: new Date(row[9] as string),
    };
  });
}

/**
 * Get a specific version of a recipe
 */
function getRecipeAtVersion(db: TestDatabase, recipeId: string, version: number): RecipeInput | undefined {
  const versionRow = db.get<[string, string, string | null, number | null, number | null, number, string | null, string]>(
    `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
     FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
    [recipeId, version]
  );

  if (!versionRow) return undefined;

  const [versionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl] = versionRow;

  const ingredientRows = db.exec(
    `SELECT name, quantity, unit, notes, category FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
    [versionId]
  );

  const instructionRows = db.exec(
    `SELECT text, duration_minutes, notes FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
    [versionId]
  );

  return {
    title,
    description: description ?? undefined,
    ingredients: ingredientRows.map((row) => ({
      name: row[0] as string,
      quantity: row[1] as number,
      unit: row[2] as RecipeInput['ingredients'][0]['unit'],
      notes: (row[3] as string | null) ?? undefined,
      category: (row[4] as RecipeInput['ingredients'][0]['category'] | null) ?? undefined,
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
}

/**
 * Restore a previous version (creates new version with that content)
 */
function restoreVersion(db: TestDatabase, recipeId: string, versionNumber: number): number {
  const versionToRestore = getRecipeAtVersion(db, recipeId, versionNumber);
  if (!versionToRestore) {
    throw new Error(`Version ${versionNumber} not found for recipe ${recipeId}`);
  }

  return updateRecipe(db, recipeId, versionToRestore);
}

/**
 * Get current version number
 */
function getCurrentVersion(db: TestDatabase, recipeId: string): number {
  const row = db.get<[number]>('SELECT current_version FROM recipes WHERE id = ?', [recipeId]);
  if (!row) throw new Error(`Recipe not found: ${recipeId}`);
  return row[0];
}

/**
 * Compare recipe inputs for equivalence
 */
function assertRecipeInputEquivalent(original: RecipeInput, retrieved: RecipeInput): void {
  expect(retrieved.title).toBe(original.title);
  expect(retrieved.description).toBe(original.description);
  expect(retrieved.prepTimeMinutes).toBe(original.prepTimeMinutes);
  expect(retrieved.cookTimeMinutes).toBe(original.cookTimeMinutes);
  expect(retrieved.servings).toBe(original.servings);
  expect(retrieved.sourceUrl).toBe(original.sourceUrl);

  expect(retrieved.ingredients.length).toBe(original.ingredients.length);
  for (let i = 0; i < original.ingredients.length; i++) {
    const origIng = original.ingredients[i]!;
    const retIng = retrieved.ingredients[i]!;
    expect(retIng.name).toBe(origIng.name);
    expect(retIng.quantity).toBeCloseTo(origIng.quantity, 5);
    expect(retIng.unit).toBe(origIng.unit);
    expect(retIng.notes).toBe(origIng.notes);
    expect(retIng.category).toBe(origIng.category);
  }

  expect(retrieved.instructions.length).toBe(original.instructions.length);
  for (let i = 0; i < original.instructions.length; i++) {
    const origInst = original.instructions[i]!;
    const retInst = retrieved.instructions[i]!;
    expect(retInst.text).toBe(origInst.text);
    expect(retInst.durationMinutes).toBe(origInst.durationMinutes);
    expect(retInst.notes).toBe(origInst.notes);
  }
}

describe('Property 3: Recipe Versioning Integrity', () => {
  let db: TestDatabase;

  beforeEach(async () => {
    db = new TestDatabase();
    await db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('should create new version on edit while preserving previous versions', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        (originalInput, updatedInput) => {
          // Create original recipe
          const recipeId = createRecipe(db, originalInput);
          
          // Verify initial state
          expect(getCurrentVersion(db, recipeId)).toBe(1);
          let history = getVersionHistory(db, recipeId);
          expect(history.length).toBe(1);
          
          // Update recipe
          const newVersion = updateRecipe(db, recipeId, updatedInput);
          
          // Verify new version was created
          expect(newVersion).toBe(2);
          expect(getCurrentVersion(db, recipeId)).toBe(2);
          
          // Verify both versions exist
          history = getVersionHistory(db, recipeId);
          expect(history.length).toBe(2);
          
          // Verify original version is preserved
          const v1 = getRecipeAtVersion(db, recipeId, 1);
          expect(v1).toBeDefined();
          assertRecipeInputEquivalent(originalInput, v1!);
          
          // Verify new version has updated content
          const v2 = getRecipeAtVersion(db, recipeId, 2);
          expect(v2).toBeDefined();
          assertRecipeInputEquivalent(updatedInput, v2!);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have version count equal to number of edits plus one', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (originalInput, edits) => {
          // Create original recipe
          const recipeId = createRecipe(db, originalInput);
          
          // Apply all edits
          for (const edit of edits) {
            updateRecipe(db, recipeId, edit);
          }
          
          // Verify version count = edits + 1 (original)
          const history = getVersionHistory(db, recipeId);
          expect(history.length).toBe(edits.length + 1);
          expect(getCurrentVersion(db, recipeId)).toBe(edits.length + 1);
          
          // Verify versions are sequential
          for (let i = 0; i < history.length; i++) {
            expect(history[i]!.version).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create new version with old content when restoring', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        (v1Input, v2Input, v3Input) => {
          // Create recipe with 3 versions
          const recipeId = createRecipe(db, v1Input);
          updateRecipe(db, recipeId, v2Input);
          updateRecipe(db, recipeId, v3Input);
          
          // Verify we have 3 versions
          expect(getCurrentVersion(db, recipeId)).toBe(3);
          expect(getVersionHistory(db, recipeId).length).toBe(3);
          
          // Restore version 1
          const restoredVersion = restoreVersion(db, recipeId, 1);
          
          // Verify a NEW version was created (not overwriting)
          expect(restoredVersion).toBe(4);
          expect(getCurrentVersion(db, recipeId)).toBe(4);
          
          // Verify all 4 versions exist
          const history = getVersionHistory(db, recipeId);
          expect(history.length).toBe(4);
          
          // Verify version 4 has content from version 1
          const v4 = getRecipeAtVersion(db, recipeId, 4);
          expect(v4).toBeDefined();
          assertRecipeInputEquivalent(v1Input, v4!);
          
          // Verify original versions are still intact
          const v1Retrieved = getRecipeAtVersion(db, recipeId, 1);
          const v2Retrieved = getRecipeAtVersion(db, recipeId, 2);
          const v3Retrieved = getRecipeAtVersion(db, recipeId, 3);
          
          assertRecipeInputEquivalent(v1Input, v1Retrieved!);
          assertRecipeInputEquivalent(v2Input, v2Retrieved!);
          assertRecipeInputEquivalent(v3Input, v3Retrieved!);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all versions after multiple restores', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        (v1Input, v2Input) => {
          // Create recipe with 2 versions
          const recipeId = createRecipe(db, v1Input);
          updateRecipe(db, recipeId, v2Input);
          
          // Restore version 1 (creates version 3)
          restoreVersion(db, recipeId, 1);
          expect(getCurrentVersion(db, recipeId)).toBe(3);
          
          // Restore version 2 (creates version 4)
          restoreVersion(db, recipeId, 2);
          expect(getCurrentVersion(db, recipeId)).toBe(4);
          
          // Restore version 1 again (creates version 5)
          restoreVersion(db, recipeId, 1);
          expect(getCurrentVersion(db, recipeId)).toBe(5);
          
          // Verify all 5 versions exist
          const history = getVersionHistory(db, recipeId);
          expect(history.length).toBe(5);
          
          // Verify content at each version
          assertRecipeInputEquivalent(v1Input, getRecipeAtVersion(db, recipeId, 1)!);
          assertRecipeInputEquivalent(v2Input, getRecipeAtVersion(db, recipeId, 2)!);
          assertRecipeInputEquivalent(v1Input, getRecipeAtVersion(db, recipeId, 3)!);
          assertRecipeInputEquivalent(v2Input, getRecipeAtVersion(db, recipeId, 4)!);
          assertRecipeInputEquivalent(v1Input, getRecipeAtVersion(db, recipeId, 5)!);
        }
      ),
      { numRuns: 100 }
    );
  });
});
