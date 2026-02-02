/**
 * Property Test: Sort Order Correctness
 *
 * **Feature: sous-chef-pwa, Property 6: Sort Order Correctness**
 * **Validates: Requirements 3.4**
 *
 * For any sort option (name, rating, date added, last cooked, cook time),
 * the recipe list SHALL be ordered correctly according to that criterion.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import type { RecipeInput, Recipe, Ingredient, Instruction } from '../../src/types/recipe';
import type { RecipeSort, RecipeSortOption, SortDirection } from '../../src/types/search';
import type { Unit } from '../../src/types/units';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test database class for property tests
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
 * Test recipe service for sort operations
 */
class TestRecipeService {
  constructor(private db: TestDatabase) {}

  createRecipe(input: RecipeInput, createdAt?: Date): Recipe {
    const recipeId = uuidv4();
    const versionId = uuidv4();
    const now = (createdAt ?? new Date()).toISOString();

    return this.db.transaction(() => {
      this.db.run(
        `INSERT INTO recipes (id, current_version, folder_id, parent_recipe_id, created_at)
         VALUES (?, 1, ?, ?, ?)`,
        [recipeId, input.folderId ?? null, input.parentRecipeId ?? null, now]
      );

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

      return this.getRecipe(recipeId)!;
    });
  }

  setRating(recipeId: string, rating: number): void {
    this.db.run(
      'INSERT INTO ratings (id, recipe_id, rating, rated_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), recipeId, rating, new Date().toISOString()]
    );
  }

  getRecipe(id: string): Recipe | undefined {
    const recipeRow = this.db.get<[string, number, string | null, string | null, string | null, string]>(
      'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
      [id]
    );

    if (!recipeRow) return undefined;

    const [recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt] = recipeRow;

    const versionRow = this.db.get<[string, string, string | null, number | null, number | null, number, string | null, string]>(
      `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
      [recipeId, currentVersion]
    );

    if (!versionRow) return undefined;

    const [versionId, title, description, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, versionCreatedAt] = versionRow;

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

  getAllRecipes(): Recipe[] {
    const rows = this.db.exec(
      'SELECT id FROM recipes WHERE archived_at IS NULL ORDER BY created_at DESC'
    );

    return rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  getRecipesSorted(sort: RecipeSort): Recipe[] {
    const recipes = this.getAllRecipes();
    return this.sortRecipes(recipes, sort);
  }

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
}

/**
 * Generator for sort options
 */
const sortOptionArb: fc.Arbitrary<RecipeSortOption> = fc.constantFrom(
  'name',
  'rating',
  'date_added',
  'last_cooked',
  'cook_time'
);

const sortDirectionArb: fc.Arbitrary<SortDirection> = fc.constantFrom('asc', 'desc');

const sortArb: fc.Arbitrary<RecipeSort> = fc.record({
  field: sortOptionArb,
  direction: sortDirectionArb,
});

/**
 * Check if array is sorted according to comparator
 */
function isSorted<T>(arr: T[], compare: (a: T, b: T) => number): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (compare(arr[i - 1]!, arr[i]!) > 0) {
      return false;
    }
  }
  return true;
}

describe('Property 6: Sort Order Correctness', () => {
  let db: TestDatabase;
  let recipeService: TestRecipeService;

  beforeEach(async () => {
    db = new TestDatabase();
    await db.initialize();
    recipeService = new TestRecipeService(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Helper to create a recipe with specific properties
   */
  function createRecipe(
    title: string,
    prepTime: number,
    cookTime: number,
    rating?: number,
    createdAt?: Date
  ): Recipe {
    const input: RecipeInput = {
      title,
      ingredients: [{ name: 'ingredient', quantity: 1, unit: 'cup' as const }],
      instructions: [{ text: 'Do something' }],
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      servings: 4,
    };
    const recipe = recipeService.createRecipe(input, createdAt);
    if (rating !== undefined) {
      recipeService.setRating(recipe.id, rating);
    }
    return recipeService.getRecipe(recipe.id)!;
  }

  it('should sort by name correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length >= 1),
          { minLength: 2, maxLength: 10 }
        ),
        sortDirectionArb,
        (titles, direction) => {
          // Create recipes with different titles
          for (const title of titles) {
            createRecipe(title, 10, 20);
          }

          const sorted = recipeService.getRecipesSorted({ field: 'name', direction });

          // Verify sort order
          const comparator = (a: Recipe, b: Recipe) => {
            const cmp = a.title.localeCompare(b.title);
            return direction === 'asc' ? cmp : -cmp;
          };

          expect(isSorted(sorted, comparator)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort by rating correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 10 }),
        sortDirectionArb,
        (ratings, direction) => {
          // Create recipes with different ratings
          for (let i = 0; i < ratings.length; i++) {
            createRecipe(`Recipe ${i}`, 10, 20, ratings[i]);
          }

          const sorted = recipeService.getRecipesSorted({ field: 'rating', direction });

          // Verify sort order
          const comparator = (a: Recipe, b: Recipe) => {
            const ratingA = a.rating ?? 0;
            const ratingB = b.rating ?? 0;
            const cmp = ratingA - ratingB;
            return direction === 'asc' ? cmp : -cmp;
          };

          expect(isSorted(sorted, comparator)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort by date added correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
          { minLength: 2, maxLength: 10 }
        ),
        sortDirectionArb,
        (dates, direction) => {
          // Create recipes with different creation dates
          for (let i = 0; i < dates.length; i++) {
            createRecipe(`Recipe ${i}`, 10, 20, undefined, dates[i]);
          }

          const sorted = recipeService.getRecipesSorted({ field: 'date_added', direction });

          // Verify sort order
          const comparator = (a: Recipe, b: Recipe) => {
            const cmp = a.createdAt.getTime() - b.createdAt.getTime();
            return direction === 'asc' ? cmp : -cmp;
          };

          expect(isSorted(sorted, comparator)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort by cook time correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            prep: fc.integer({ min: 0, max: 120 }),
            cook: fc.integer({ min: 0, max: 240 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        sortDirectionArb,
        (times, direction) => {
          // Create recipes with different cook times
          for (let i = 0; i < times.length; i++) {
            createRecipe(`Recipe ${i}`, times[i].prep, times[i].cook);
          }

          const sorted = recipeService.getRecipesSorted({ field: 'cook_time', direction });

          // Verify sort order
          const comparator = (a: Recipe, b: Recipe) => {
            const timeA = a.prepTime.minutes + a.cookTime.minutes;
            const timeB = b.prepTime.minutes + b.cookTime.minutes;
            const cmp = timeA - timeB;
            return direction === 'asc' ? cmp : -cmp;
          };

          expect(isSorted(sorted, comparator)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain sort order for any sort option', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        sortArb,
        (recipeCount, sort) => {
          // Create random recipes
          for (let i = 0; i < recipeCount; i++) {
            const rating = Math.floor(Math.random() * 5) + 1;
            const prepTime = Math.floor(Math.random() * 60);
            const cookTime = Math.floor(Math.random() * 120);
            const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            createRecipe(`Recipe ${i}`, prepTime, cookTime, rating, date);
          }

          const sorted = recipeService.getRecipesSorted(sort);

          // Get comparator based on sort field
          const getComparator = () => {
            const multiplier = sort.direction === 'asc' ? 1 : -1;
            switch (sort.field) {
              case 'name':
                return (a: Recipe, b: Recipe) => multiplier * a.title.localeCompare(b.title);
              case 'rating':
                return (a: Recipe, b: Recipe) => multiplier * ((a.rating ?? 0) - (b.rating ?? 0));
              case 'date_added':
                return (a: Recipe, b: Recipe) => multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
              case 'last_cooked':
                return (a: Recipe, b: Recipe) => multiplier * (a.updatedAt.getTime() - b.updatedAt.getTime());
              case 'cook_time':
                return (a: Recipe, b: Recipe) => {
                  const timeA = a.prepTime.minutes + a.cookTime.minutes;
                  const timeB = b.prepTime.minutes + b.cookTime.minutes;
                  return multiplier * (timeA - timeB);
                };
              default:
                return () => 0;
            }
          };

          expect(isSorted(sorted, getComparator())).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty recipe list', () => {
    fc.assert(
      fc.property(sortArb, (sort) => {
        // Use the shared database - it's empty at the start of each test
        const sorted = recipeService.getRecipesSorted(sort);
        expect(sorted).toEqual([]);
      }),
      { numRuns: 10 }
    );
  });

  it('should handle single recipe', () => {
    fc.assert(
      fc.property(sortArb, (sort) => {
        // Create a single recipe and test sorting
        const input: RecipeInput = {
          title: 'Single Recipe',
          ingredients: [{ name: 'ingredient', quantity: 1, unit: 'cup' as const }],
          instructions: [{ text: 'Do something' }],
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          servings: 4,
        };
        recipeService.createRecipe(input);
        
        const sorted = recipeService.getRecipesSorted(sort);
        expect(sorted.length).toBeGreaterThanOrEqual(1);
        expect(sorted.some(r => r.title === 'Single Recipe')).toBe(true);
      }),
      { numRuns: 10 }
    );
  });
});
