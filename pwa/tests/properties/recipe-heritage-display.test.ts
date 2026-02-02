/**
 * Property Test: Recipe Heritage Display
 *
 * **Feature: sous-chef-pwa, Property 11: Recipe Heritage Display**
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 *
 * For any duplicated recipe, a link to the parent recipe SHALL be visible.
 * For any recipe with derived copies, links to those children SHALL be visible.
 * Deleting a recipe SHALL archive it (not permanently remove).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import { minimalRecipeInputArb } from '../generators/recipe-generators';
import type { RecipeInput, RecipeHeritage } from '../../src/types/recipe';
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

interface SimpleRecipe {
  id: string;
  title: string;
  parentRecipeId?: string;
  archivedAt?: Date;
}

/**
 * Create a recipe in the database
 */
function createRecipe(db: TestDatabase, input: RecipeInput, parentRecipeId?: string): string {
  const recipeId = uuidv4();
  const versionId = uuidv4();
  const now = new Date().toISOString();

  return db.transaction(() => {
    db.run(
      `INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, created_at)
       VALUES (?, 1, ?, ?, ?)`,
      [recipeId, input.folderId ?? null, parentRecipeId ?? null, now]
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
 * Duplicate a recipe with heritage tracking
 */
function duplicateRecipe(db: TestDatabase, originalId: string, newTitle: string): string {
  const originalRow = db.get<[string, number]>(
    'SELECT id, current_version FROM recipes WHERE id = ?',
    [originalId]
  );

  if (!originalRow) {
    throw new Error(`Recipe not found: ${originalId}`);
  }

  const [, currentVersion] = originalRow;

  const versionRow = db.get<[string, string | null, number | null, number | null, number, string | null]>(
    `SELECT title, description, prep_time_minutes, cook_time_minutes, servings, source_url
     FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
    [originalId, currentVersion]
  );

  if (!versionRow) {
    throw new Error(`Version not found for recipe: ${originalId}`);
  }

  const versionId = db.get<[string]>(
    'SELECT id FROM recipe_versions WHERE recipe_id = ? AND version = ?',
    [originalId, currentVersion]
  )?.[0];

  const ingredientRows = db.exec(
    `SELECT name, quantity, unit, notes, category FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
    [versionId]
  );

  const instructionRows = db.exec(
    `SELECT text, duration_minutes, notes FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
    [versionId]
  );

  const input: RecipeInput = {
    title: newTitle,
    description: versionRow[1] ?? undefined,
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
    prepTimeMinutes: versionRow[2] ?? 0,
    cookTimeMinutes: versionRow[3] ?? 0,
    servings: versionRow[4],
    sourceUrl: versionRow[5] ?? undefined,
  };

  return createRecipe(db, input, originalId);
}

/**
 * Get recipe heritage information
 */
function getRecipeHeritage(db: TestDatabase, recipeId: string): RecipeHeritage {
  const recipeRow = db.get<[string, number, string | null, string | null, string | null, string]>(
    'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
    [recipeId]
  );

  if (!recipeRow) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }

  const [id, currentVersion, , parentRecipeId, archivedAt, createdAt] = recipeRow;

  const versionRow = db.get<[string]>(
    'SELECT title FROM recipe_versions WHERE recipe_id = ? AND version = ?',
    [id, currentVersion]
  );

  const recipe: SimpleRecipe = {
    id,
    title: versionRow?.[0] ?? '',
    parentRecipeId: parentRecipeId ?? undefined,
    archivedAt: archivedAt ? new Date(archivedAt) : undefined,
  };

  // Get parent
  let parent: SimpleRecipe | undefined;
  if (parentRecipeId) {
    const parentRow = db.get<[string, number, string | null]>(
      'SELECT id, current_version, archived_at FROM recipes WHERE id = ?',
      [parentRecipeId]
    );
    if (parentRow) {
      const parentVersionRow = db.get<[string]>(
        'SELECT title FROM recipe_versions WHERE recipe_id = ? AND version = ?',
        [parentRow[0], parentRow[1]]
      );
      parent = {
        id: parentRow[0],
        title: parentVersionRow?.[0] ?? '',
        archivedAt: parentRow[2] ? new Date(parentRow[2]) : undefined,
      };
    }
  }

  // Get ancestors
  const ancestors: SimpleRecipe[] = [];
  let currentParentId = parentRecipeId;
  while (currentParentId) {
    const ancestorRow = db.get<[string, number, string | null, string | null]>(
      'SELECT id, current_version, parent_recipe_id, archived_at FROM recipes WHERE id = ?',
      [currentParentId]
    );
    if (ancestorRow) {
      const ancestorVersionRow = db.get<[string]>(
        'SELECT title FROM recipe_versions WHERE recipe_id = ? AND version = ?',
        [ancestorRow[0], ancestorRow[1]]
      );
      ancestors.push({
        id: ancestorRow[0],
        title: ancestorVersionRow?.[0] ?? '',
        parentRecipeId: ancestorRow[2] ?? undefined,
        archivedAt: ancestorRow[3] ? new Date(ancestorRow[3]) : undefined,
      });
      currentParentId = ancestorRow[2];
    } else {
      break;
    }
  }

  // Get children
  const childRows = db.exec(
    'SELECT id, current_version, archived_at FROM recipes WHERE parent_recipe_id = ?',
    [recipeId]
  );
  const children: SimpleRecipe[] = childRows.map((row) => {
    const childVersionRow = db.get<[string]>(
      'SELECT title FROM recipe_versions WHERE recipe_id = ? AND version = ?',
      [row[0], row[1]]
    );
    return {
      id: row[0] as string,
      title: childVersionRow?.[0] ?? '',
      parentRecipeId: recipeId,
      archivedAt: row[2] ? new Date(row[2] as string) : undefined,
    };
  });

  return {
    recipe: recipe as any,
    parent: parent as any,
    ancestors: ancestors as any[],
    children: children as any[],
  };
}

/**
 * Archive (soft delete) a recipe
 */
function archiveRecipe(db: TestDatabase, recipeId: string): void {
  const now = new Date().toISOString();
  const result = db.run('UPDATE recipes SET archived_at = ? WHERE id = ?', [now, recipeId]);
  if (result.changes === 0) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }
}

/**
 * Check if a recipe exists (including archived)
 */
function recipeExists(db: TestDatabase, recipeId: string): boolean {
  const row = db.get<[number]>('SELECT 1 FROM recipes WHERE id = ?', [recipeId]);
  return row !== undefined;
}

/**
 * Check if a recipe is archived
 */
function isArchived(db: TestDatabase, recipeId: string): boolean {
  const row = db.get<[string | null]>('SELECT archived_at FROM recipes WHERE id = ?', [recipeId]);
  return row !== undefined && row[0] !== null;
}

/**
 * Get all non-archived recipes
 */
function getAllActiveRecipes(db: TestDatabase): string[] {
  const rows = db.exec('SELECT id FROM recipes WHERE archived_at IS NULL');
  return rows.map((row) => row[0] as string);
}

describe('Property 11: Recipe Heritage Display', () => {
  let db: TestDatabase;

  beforeEach(async () => {
    db = new TestDatabase();
    await db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('should show parent link for duplicated recipes', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (originalInput, copyTitle) => {
          // Create original recipe
          const originalId = createRecipe(db, originalInput);
          
          // Duplicate it
          const duplicateId = duplicateRecipe(db, originalId, copyTitle);
          
          // Get heritage for the duplicate
          const heritage = getRecipeHeritage(db, duplicateId);
          
          // Verify parent link is visible
          expect(heritage.parent).toBeDefined();
          expect(heritage.parent?.id).toBe(originalId);
          expect(heritage.recipe.parentRecipeId).toBe(originalId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show children links for recipes with derived copies', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        (originalInput, copyTitles) => {
          // Create original recipe
          const originalId = createRecipe(db, originalInput);
          
          // Create multiple duplicates
          const duplicateIds = copyTitles.map((title) => 
            duplicateRecipe(db, originalId, title)
          );
          
          // Get heritage for the original
          const heritage = getRecipeHeritage(db, originalId);
          
          // Verify children links are visible
          expect(heritage.children.length).toBe(duplicateIds.length);
          
          // Verify all duplicates are in children
          const childIds = heritage.children.map((c) => c.id);
          for (const dupId of duplicateIds) {
            expect(childIds).toContain(dupId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show full ancestor chain for deeply nested duplicates', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer({ min: 2, max: 5 }),
        (originalInput, depth) => {
          // Create chain of duplicates
          const recipeIds: string[] = [];
          let currentId = createRecipe(db, originalInput);
          recipeIds.push(currentId);
          
          for (let i = 1; i < depth; i++) {
            currentId = duplicateRecipe(db, currentId, `Copy ${i}`);
            recipeIds.push(currentId);
          }
          
          // Get heritage for the deepest duplicate
          const deepestId = recipeIds[recipeIds.length - 1]!;
          const heritage = getRecipeHeritage(db, deepestId);
          
          // Verify ancestor chain length
          expect(heritage.ancestors.length).toBe(depth - 1);
          
          // Verify ancestors are in correct order (immediate parent first)
          for (let i = 0; i < heritage.ancestors.length; i++) {
            const expectedId = recipeIds[recipeIds.length - 2 - i];
            expect(heritage.ancestors[i]!.id).toBe(expectedId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should archive recipe instead of permanently deleting', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        const recipeId = createRecipe(db, recipeInput);
        
        // Verify it exists and is not archived
        expect(recipeExists(db, recipeId)).toBe(true);
        expect(isArchived(db, recipeId)).toBe(false);
        
        // Archive (soft delete) the recipe
        archiveRecipe(db, recipeId);
        
        // Verify recipe still exists but is archived
        expect(recipeExists(db, recipeId)).toBe(true);
        expect(isArchived(db, recipeId)).toBe(true);
        
        // Verify it's not in active recipes list
        const activeRecipes = getAllActiveRecipes(db);
        expect(activeRecipes).not.toContain(recipeId);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve heritage links when parent is archived', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (originalInput, copyTitle) => {
          // Create original and duplicate
          const originalId = createRecipe(db, originalInput);
          const duplicateId = duplicateRecipe(db, originalId, copyTitle);
          
          // Archive the original
          archiveRecipe(db, originalId);
          
          // Verify duplicate still has parent link
          const heritage = getRecipeHeritage(db, duplicateId);
          expect(heritage.parent).toBeDefined();
          expect(heritage.parent?.id).toBe(originalId);
          
          // Verify original still shows child link
          const originalHeritage = getRecipeHeritage(db, originalId);
          expect(originalHeritage.children.length).toBe(1);
          expect(originalHeritage.children[0]!.id).toBe(duplicateId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve heritage links when child is archived', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (originalInput, copyTitle) => {
          // Create original and duplicate
          const originalId = createRecipe(db, originalInput);
          const duplicateId = duplicateRecipe(db, originalId, copyTitle);
          
          // Archive the duplicate
          archiveRecipe(db, duplicateId);
          
          // Verify original still shows child link
          const heritage = getRecipeHeritage(db, originalId);
          expect(heritage.children.length).toBe(1);
          expect(heritage.children[0]!.id).toBe(duplicateId);
          
          // Verify duplicate still has parent link
          const duplicateHeritage = getRecipeHeritage(db, duplicateId);
          expect(duplicateHeritage.parent).toBeDefined();
          expect(duplicateHeritage.parent?.id).toBe(originalId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
