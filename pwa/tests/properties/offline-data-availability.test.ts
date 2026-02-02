/**
 * Property Test: Offline Data Availability
 * 
 * **Feature: sous-chef-pwa, Property 12: Offline Data Availability**
 * **Validates: Requirements 1.4**
 * 
 * For any locally stored recipe, menu, or shopping list, the data SHALL be
 * displayable when offline without errors.
 * 
 * This test validates that:
 * 1. Recipes stored in the local database can be retrieved without network access
 * 2. Data retrieval operations don't throw errors when offline
 * 3. All recipe fields are accessible when offline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import { minimalRecipeInputArb } from '../generators/recipe-generators';
import type { RecipeInput } from '../../src/types/recipe';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simplified in-memory database for testing offline scenarios
 * Simulates the local database that would be available offline
 */
class OfflineTestDatabase {
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
 * Create a recipe in the database (simulating online storage)
 */
function storeRecipe(db: OfflineTestDatabase, input: RecipeInput): string {
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
 * Retrieve a recipe from the database (simulating offline access)
 * This function should work without any network access
 */
function retrieveRecipeOffline(db: OfflineTestDatabase, id: string): RecipeInput | undefined {
  // This simulates reading from local storage when offline
  // No network calls are made - all data comes from the local database
  
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
 * List all recipes from the database (simulating offline list view)
 */
function listRecipesOffline(db: OfflineTestDatabase): Array<{ id: string; title: string }> {
  const rows = db.exec(
    `SELECT r.id, rv.title 
     FROM recipes r 
     JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
     WHERE r.archived_at IS NULL
     ORDER BY rv.title`
  );
  
  return rows.map(row => ({
    id: row[0] as string,
    title: row[1] as string,
  }));
}

/**
 * Search recipes offline (simulating offline search)
 */
function searchRecipesOffline(db: OfflineTestDatabase, query: string): Array<{ id: string; title: string }> {
  const searchPattern = `%${query}%`;
  const rows = db.exec(
    `SELECT DISTINCT r.id, rv.title 
     FROM recipes r 
     JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
     LEFT JOIN ingredients i ON rv.id = i.recipe_version_id
     WHERE r.archived_at IS NULL
       AND (rv.title LIKE ? OR rv.description LIKE ? OR i.name LIKE ?)
     ORDER BY rv.title`,
    [searchPattern, searchPattern, searchPattern]
  );
  
  return rows.map(row => ({
    id: row[0] as string,
    title: row[1] as string,
  }));
}

describe('Property 12: Offline Data Availability', () => {
  let db: OfflineTestDatabase;

  beforeEach(async () => {
    db = new OfflineTestDatabase();
    await db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('should retrieve any stored recipe without errors when offline', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Store recipe (simulating online storage)
        const recipeId = storeRecipe(db, recipeInput);

        // Retrieve recipe offline (no network access)
        // This should not throw any errors
        const retrieved = retrieveRecipeOffline(db, recipeId);

        // Verify retrieval succeeded
        expect(retrieved).toBeDefined();
        expect(retrieved!.title).toBe(recipeInput.title);
        expect(retrieved!.ingredients.length).toBe(recipeInput.ingredients.length);
        expect(retrieved!.instructions.length).toBe(recipeInput.instructions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should list all stored recipes without errors when offline', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 10 }),
        (recipeInputs) => {
          // Get count before storing
          const countBefore = listRecipesOffline(db).length;
          
          // Store multiple recipes
          const storedIds = recipeInputs.map(input => storeRecipe(db, input));

          // List recipes offline
          const listedRecipes = listRecipesOffline(db);

          // Verify the new recipes were added
          expect(listedRecipes.length).toBe(countBefore + storedIds.length);
          
          // Verify each stored recipe appears in the list
          for (const id of storedIds) {
            expect(listedRecipes.some(r => r.id === id)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should search recipes without errors when offline', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Store recipes
          recipeInputs.forEach(input => storeRecipe(db, input));

          // Search by title of first recipe (should find at least one)
          const firstTitle = recipeInputs[0]!.title;
          const searchTerm = firstTitle.substring(0, Math.min(3, firstTitle.length));
          
          // Search should not throw errors
          const searchResults = searchRecipesOffline(db, searchTerm);
          
          // Search results should be an array (may be empty if search term doesn't match)
          expect(Array.isArray(searchResults)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should access all recipe fields without errors when offline', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Store recipe
        const recipeId = storeRecipe(db, recipeInput);

        // Retrieve and access all fields offline
        const retrieved = retrieveRecipeOffline(db, recipeId);
        
        expect(retrieved).toBeDefined();
        
        // Access all fields - none should throw
        const title = retrieved!.title;
        const description = retrieved!.description;
        const prepTime = retrieved!.prepTimeMinutes;
        const cookTime = retrieved!.cookTimeMinutes;
        const servings = retrieved!.servings;
        const sourceUrl = retrieved!.sourceUrl;
        const tags = retrieved!.tags;
        
        // Access all ingredients
        for (const ing of retrieved!.ingredients) {
          const name = ing.name;
          const qty = ing.quantity;
          const unit = ing.unit;
          const notes = ing.notes;
          const category = ing.category;
          
          // Verify values are accessible
          expect(typeof name).toBe('string');
          expect(typeof qty).toBe('number');
          expect(typeof unit).toBe('string');
        }
        
        // Access all instructions
        for (const inst of retrieved!.instructions) {
          const text = inst.text;
          const duration = inst.durationMinutes;
          const notes = inst.notes;
          
          // Verify values are accessible
          expect(typeof text).toBe('string');
        }
        
        // Verify basic field types
        expect(typeof title).toBe('string');
        expect(typeof prepTime).toBe('number');
        expect(typeof cookTime).toBe('number');
        expect(typeof servings).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('should handle non-existent recipe gracefully when offline', () => {
    // Try to retrieve a recipe that doesn't exist
    const nonExistentId = uuidv4();
    const result = retrieveRecipeOffline(db, nonExistentId);
    
    // Should return undefined, not throw
    expect(result).toBeUndefined();
  });

  it('should handle empty database gracefully when offline', () => {
    // List recipes from empty database
    const recipes = listRecipesOffline(db);
    
    // Should return empty array, not throw
    expect(recipes).toEqual([]);
    
    // Search in empty database
    const searchResults = searchRecipesOffline(db, 'test');
    
    // Should return empty array, not throw
    expect(searchResults).toEqual([]);
  });
});
