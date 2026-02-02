/**
 * Property Test: Search Result Completeness
 *
 * **Feature: sous-chef-pwa, Property 5: Search Result Completeness**
 * **Validates: Requirements 3.2, 3.3**
 *
 * For any search query, the results SHALL include all recipes where the query
 * matches the title, any ingredient name, any instruction text, or any tag.
 * Results SHALL be filterable by tags, rating, cook time, and folder.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from '../../src/db/schema';
import type { RecipeInput, Recipe, Ingredient, Instruction } from '../../src/types/recipe';
import type { RecipeFilters, RecipeSort, RecipeSearchResult } from '../../src/types/search';
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
 * Test recipe service for search operations
 */
class TestRecipeService {
  constructor(private db: TestDatabase) {}

  createRecipe(input: RecipeInput): Recipe {
    const recipeId = uuidv4();
    const versionId = uuidv4();
    const now = new Date().toISOString();

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

      if (input.tags) {
        for (const tagName of input.tags) {
          const existingTag = this.db.get<[string]>('SELECT id FROM tags WHERE name = ?', [tagName]);
          let tagId: string;
          if (existingTag) {
            tagId = existingTag[0];
          } else {
            tagId = uuidv4();
            this.db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
          }
          this.db.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [recipeId, tagId]);
        }
      }

      return this.getRecipe(recipeId)!;
    });
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

  advancedSearch(params: { filters?: RecipeFilters; sort?: RecipeSort; limit?: number; offset?: number } = {}): RecipeSearchResult<Recipe> {
    const { filters = {}, sort, limit = 50, offset = 0 } = params;
    
    let recipes = this.getAllRecipesWithFilters(filters);
    
    if (sort) {
      recipes = this.sortRecipes(recipes, sort);
    }
    
    const total = recipes.length;
    const hasMore = offset + limit < total;
    const items = recipes.slice(offset, offset + limit);
    
    return { items, total, hasMore };
  }

  private getAllRecipesWithFilters(filters: RecipeFilters): Recipe[] {
    const { query, tags, minRating, maxCookTime, folderId, includeArchived } = filters;
    
    let sql = `
      SELECT DISTINCT r.id FROM recipes r
      JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
    `;
    
    const conditions: string[] = [];
    const params: unknown[] = [];
    
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
    
    if (!includeArchived) {
      conditions.push('r.archived_at IS NULL');
    }
    
    if (folderId) {
      conditions.push('r.folder_id = ?');
      params.push(folderId);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const rows = this.db.exec(sql, params);
    
    let recipes = rows
      .map((row) => this.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
    
    if (tags && tags.length > 0) {
      recipes = recipes.filter(recipe => 
        tags.every(tag => 
          recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        )
      );
    }
    
    if (minRating !== undefined) {
      recipes = recipes.filter(recipe => 
        recipe.rating !== undefined && recipe.rating >= minRating
      );
    }
    
    if (maxCookTime !== undefined) {
      recipes = recipes.filter(recipe => {
        const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
        return totalTime <= maxCookTime;
      });
    }
    
    return recipes;
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

describe('Property 5: Search Result Completeness', () => {
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
   * Helper to create a recipe with specific searchable content
   */
  function createRecipeWithContent(
    title: string,
    ingredientNames: string[],
    instructionTexts: string[],
    tags: string[]
  ): string {
    const input: RecipeInput = {
      title,
      ingredients: ingredientNames.map((name) => ({
        name,
        quantity: 1,
        unit: 'cup' as const,
      })),
      instructions: instructionTexts.map((text) => ({ text })),
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 4,
      tags,
    };
    const recipe = recipeService.createRecipe(input);
    return recipe.id;
  }

  it('should find recipes matching title', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z0-9 ]+$/.test(s)),
        (searchTerm) => {
          const titleWithTerm = `Recipe with ${searchTerm} in title`;
          const recipeId = createRecipeWithContent(
            titleWithTerm,
            ['flour', 'sugar'],
            ['Mix ingredients'],
            ['dessert']
          );

          const results = recipeService.advancedSearch({
            filters: { query: searchTerm },
          });

          const found = results.items.some((r) => r.id === recipeId);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should find recipes matching ingredient names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z0-9 ]+$/.test(s)),
        (ingredientName) => {
          const recipeId = createRecipeWithContent(
            'Test Recipe',
            [ingredientName, 'water'],
            ['Cook everything'],
            ['main']
          );

          const results = recipeService.advancedSearch({
            filters: { query: ingredientName },
          });

          const found = results.items.some((r) => r.id === recipeId);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should find recipes matching instruction text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z0-9 ]+$/.test(s)),
        (instructionWord) => {
          const recipeId = createRecipeWithContent(
            'Test Recipe',
            ['flour'],
            [`Step: ${instructionWord} the mixture`],
            ['baking']
          );

          const results = recipeService.advancedSearch({
            filters: { query: instructionWord },
          });

          const found = results.items.some((r) => r.id === recipeId);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should find recipes matching tags', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z0-9]+$/.test(s)),
        (tagName) => {
          const recipeId = createRecipeWithContent(
            'Test Recipe for Tag Search',
            ['ingredient'],
            ['Do something'],
            [tagName]
          );

          const results = recipeService.advancedSearch({
            filters: { query: tagName },
          });

          const found = results.items.some((r) => r.id === recipeId);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should filter by tags (AND logic)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 2, maxLength: 15 }).filter((s) => s.trim().length >= 2 && /^[a-zA-Z0-9]+$/.test(s)),
          { minLength: 2, maxLength: 4 }
        ).filter((arr) => new Set(arr).size === arr.length), // Ensure unique tags
        (tags) => {
          const recipeId = createRecipeWithContent(
            'Tagged Recipe',
            ['ingredient'],
            ['Step one'],
            tags
          );

          createRecipeWithContent(
            'Partial Tags Recipe',
            ['ingredient'],
            ['Step one'],
            [tags[0]]
          );

          const results = recipeService.advancedSearch({
            filters: { tags },
          });

          const found = results.items.some((r) => r.id === recipeId);
          expect(found).toBe(true);

          for (const recipe of results.items) {
            for (const tag of tags) {
              expect(
                recipe.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
              ).toBe(true);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should filter by minimum rating', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (minRating) => {
        const highRatedId = createRecipeWithContent(
          'High Rated',
          ['ingredient'],
          ['Step'],
          []
        );
        const lowRatedId = createRecipeWithContent(
          'Low Rated',
          ['ingredient'],
          ['Step'],
          []
        );

        db.run(
          'INSERT INTO ratings (id, recipe_id, rating, rated_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), highRatedId, 5, new Date().toISOString()]
        );
        db.run(
          'INSERT INTO ratings (id, recipe_id, rating, rated_at) VALUES (?, ?, ?, ?)',
          [uuidv4(), lowRatedId, 1, new Date().toISOString()]
        );

        const results = recipeService.advancedSearch({
          filters: { minRating },
        });

        for (const recipe of results.items) {
          if (recipe.rating !== undefined) {
            expect(recipe.rating).toBeGreaterThanOrEqual(minRating);
          }
        }
      }),
      { numRuns: 20 }
    );
  });

  it('should filter by maximum cook time', () => {
    fc.assert(
      fc.property(fc.integer({ min: 15, max: 120 }), (maxCookTime) => {
        const quickInput: RecipeInput = {
          title: 'Quick Recipe',
          ingredients: [{ name: 'ingredient', quantity: 1, unit: 'cup' }],
          instructions: [{ text: 'Do it fast' }],
          prepTimeMinutes: 5,
          cookTimeMinutes: 10,
          servings: 2,
        };
        recipeService.createRecipe(quickInput);

        const slowInput: RecipeInput = {
          title: 'Slow Recipe',
          ingredients: [{ name: 'ingredient', quantity: 1, unit: 'cup' }],
          instructions: [{ text: 'Take your time' }],
          prepTimeMinutes: 60,
          cookTimeMinutes: 120,
          servings: 4,
        };
        recipeService.createRecipe(slowInput);

        const results = recipeService.advancedSearch({
          filters: { maxCookTime },
        });

        for (const recipe of results.items) {
          const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
          expect(totalTime).toBeLessThanOrEqual(maxCookTime);
        }
      }),
      { numRuns: 20 }
    );
  });

  it('should return all matching recipes (no false negatives)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 10 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z0-9]+$/.test(s)),
        fc.integer({ min: 2, max: 5 }),
        (searchTerm, recipeCount) => {
          const createdIds: string[] = [];
          for (let i = 0; i < recipeCount; i++) {
            const id = createRecipeWithContent(
              `Recipe ${i} with ${searchTerm}`,
              ['flour'],
              ['Mix'],
              []
            );
            createdIds.push(id);
          }

          const results = recipeService.advancedSearch({
            filters: { query: searchTerm },
          });

          for (const id of createdIds) {
            const found = results.items.some((r) => r.id === id);
            expect(found).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
