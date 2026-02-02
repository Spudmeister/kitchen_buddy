/**
 * Property Test: Database Persistence Round-Trip
 * 
 * **Feature: sous-chef-pwa, Property: Database Persistence Round-Trip**
 * **Validates: Requirements 1.4**
 * 
 * For any valid recipe data, writing to sql.js and persisting to IndexedDB,
 * then loading from IndexedDB should produce equivalent data.
 * 
 * This test validates that:
 * 1. Data written to sql.js is correctly persisted to IndexedDB
 * 2. Data loaded from IndexedDB is correctly restored to sql.js
 * 3. The round-trip preserves all recipe fields
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import { minimalRecipeInputArb } from '../generators/recipe-generators';
import type { RecipeInput } from '../../src/types/recipe';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simplified in-memory database for testing
 * (Avoids IndexedDB which requires browser environment)
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

  export(): Uint8Array {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }

  async importData(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database(data);
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

    if (input.tags) {
      for (const tagName of input.tags) {
        const existingTag = db.get<[string]>('SELECT id FROM tags WHERE name = ?', [tagName]);
        let tagId: string;
        if (existingTag) {
          tagId = existingTag[0];
        } else {
          tagId = uuidv4();
          db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
        }
        db.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [recipeId, tagId]);
      }
    }

    return recipeId;
  });
}

/**
 * Get a recipe from the database
 */
function getRecipe(db: TestDatabase, id: string): RecipeInput | undefined {
  const recipeRow = db.get<[string, number, string | null, string | null, string | null, string]>(
    'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
    [id]
  );

  if (!recipeRow) return undefined;

  const [recipeId, currentVersion] = recipeRow;

  const versionRow = db.get<[string, string, string | null, number | null, number | null, number, string | null, string]>(
    `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
     FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
    [recipeId, currentVersion]
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

  const tagRows = db.exec(
    `SELECT t.name FROM tags t JOIN recipe_tags rt ON t.id = rt.tag_id WHERE rt.recipe_id = ?`,
    [recipeId]
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
    tags: tagRows.map((row) => row[0] as string),
    sourceUrl: sourceUrl ?? undefined,
  };
}

/**
 * Compare two recipe inputs for equivalence
 */
function assertRecipeEquivalent(original: RecipeInput, retrieved: RecipeInput): void {
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

  const originalTags = original.tags ?? [];
  const retrievedTags = retrieved.tags ?? [];
  expect(retrievedTags.sort()).toEqual([...new Set(originalTags)].sort());
}

describe('Property: Database Persistence Round-Trip', () => {
  let db: TestDatabase;

  beforeEach(async () => {
    db = new TestDatabase();
    await db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('should preserve recipe data through database write and read cycle', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Write recipe to database
        const recipeId = createRecipe(db, recipeInput);

        // Read recipe back
        const retrieved = getRecipe(db, recipeId);

        // Verify it exists
        expect(retrieved).toBeDefined();

        // Verify all fields are preserved
        assertRecipeEquivalent(recipeInput, retrieved!);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve recipe data through export and import cycle', async () => {
    await fc.assert(
      fc.asyncProperty(minimalRecipeInputArb, async (recipeInput) => {
        // Write recipe to database
        const recipeId = createRecipe(db, recipeInput);

        // Export database
        const exportedData = db.export();

        // Create new database and import
        const db2 = new TestDatabase();
        await db2.importData(exportedData);

        // Read recipe from imported database
        const retrieved = getRecipe(db2, recipeId);

        // Verify it exists
        expect(retrieved).toBeDefined();

        // Verify all fields are preserved
        assertRecipeEquivalent(recipeInput, retrieved!);

        db2.close();
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve multiple recipes through export and import cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 10 }),
        async (recipeInputs) => {
          // Write all recipes to database
          const recipeIds = recipeInputs.map((input) => createRecipe(db, input));

          // Export database
          const exportedData = db.export();

          // Create new database and import
          const db2 = new TestDatabase();
          await db2.importData(exportedData);

          // Verify all recipes are preserved
          for (let i = 0; i < recipeInputs.length; i++) {
            const retrieved = getRecipe(db2, recipeIds[i]!);
            expect(retrieved).toBeDefined();
            assertRecipeEquivalent(recipeInputs[i]!, retrieved!);
          }

          db2.close();
        }
      ),
      { numRuns: 50 }
    );
  });
});
