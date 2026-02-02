/**
 * Mock Database for Sous Chef Testing
 * 
 * Provides in-memory SQLite database for isolated testing.
 * Supports seeding with test data and state inspection.
 * 
 * Requirements: Design - Testing Strategy
 */

import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import type { RecipeInput, Recipe } from '../../src/types/recipe.js';
import type { MenuInput, Menu, MenuAssignmentInput } from '../../src/types/menu.js';
import type { CookSessionInput, RatingInput } from '../../src/types/statistics.js';

/**
 * Seed data for initializing test database
 */
export interface DatabaseSeedData {
  recipes?: RecipeInput[];
  menus?: Array<{
    menu: MenuInput;
    assignments?: MenuAssignmentInput[];
  }>;
  cookSessions?: CookSessionInput[];
  ratings?: RatingInput[];
  tags?: Array<{ recipeId: string; tags: string[] }>;
  preferences?: Record<string, string>;
}

/**
 * Mock Database wrapper for testing
 * 
 * Provides utilities for:
 * - Creating isolated in-memory databases
 * - Seeding with test data
 * - Inspecting database state
 * - Resetting between tests
 */
export class MockDatabase {
  private db: Database | null = null;
  private seedData: DatabaseSeedData | null = null;
  private createdRecipeIds: string[] = [];

  /**
   * Initialize the mock database
   */
  async initialize(): Promise<Database> {
    this.db = await createDatabase();
    return this.db;
  }

  /**
   * Get the underlying database instance
   */
  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Seed the database with test data
   */
  async seed(data: DatabaseSeedData): Promise<{
    recipeIds: string[];
    menuIds: string[];
  }> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    this.seedData = data;
    const recipeIds: string[] = [];
    const menuIds: string[] = [];

    // Seed recipes
    if (data.recipes && data.recipes.length > 0) {
      const repo = new RecipeRepository(this.db);
      for (const recipeInput of data.recipes) {
        const recipe = repo.createRecipe(recipeInput);
        recipeIds.push(recipe.id);
        this.createdRecipeIds.push(recipe.id);
      }
    }

    // Seed menus (would need MenuService, simplified here)
    if (data.menus && data.menus.length > 0) {
      // Menu seeding would be implemented with MenuService
      // For now, just track that we would create menus
      for (const _menuData of data.menus) {
        // Placeholder - actual implementation would use MenuService
        menuIds.push(`menu-${menuIds.length + 1}`);
      }
    }

    // Seed cook sessions (would need StatisticsService)
    if (data.cookSessions && data.cookSessions.length > 0) {
      // Cook session seeding would be implemented with StatisticsService
    }

    // Seed ratings (would need StatisticsService)
    if (data.ratings && data.ratings.length > 0) {
      // Rating seeding would be implemented with StatisticsService
    }

    // Seed preferences
    if (data.preferences) {
      for (const [key, value] of Object.entries(data.preferences)) {
        this.db.run(
          'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
    }

    return { recipeIds, menuIds };
  }

  /**
   * Get all recipe IDs created during seeding
   */
  getCreatedRecipeIds(): string[] {
    return [...this.createdRecipeIds];
  }

  /**
   * Get the seed data used
   */
  getSeedData(): DatabaseSeedData | null {
    return this.seedData;
  }

  /**
   * Get table row count
   */
  getTableCount(tableName: string): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result = this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result?.count ?? 0;
  }

  /**
   * Get all rows from a table (for debugging)
   */
  getTableRows<T>(tableName: string): T[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.all<T>(`SELECT * FROM ${tableName}`);
  }

  /**
   * Execute raw SQL (for testing edge cases)
   */
  executeRaw(sql: string, params?: unknown[]): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.run(sql, params);
  }

  /**
   * Query raw SQL (for testing edge cases)
   */
  queryRaw<T>(sql: string, params?: unknown[]): T[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.all<T>(sql, params);
  }

  /**
   * Reset the database to initial state
   */
  async reset(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
    this.seedData = null;
    this.createdRecipeIds = [];
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    recipes: number;
    recipeVersions: number;
    ingredients: number;
    instructions: number;
    tags: number;
    menus: number;
    cookSessions: number;
    ratings: number;
  } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return {
      recipes: this.getTableCount('recipes'),
      recipeVersions: this.getTableCount('recipe_versions'),
      ingredients: this.getTableCount('ingredients'),
      instructions: this.getTableCount('instructions'),
      tags: this.getTableCount('tags'),
      menus: this.getTableCount('menus'),
      cookSessions: this.getTableCount('cook_sessions'),
      ratings: this.getTableCount('ratings'),
    };
  }
}

/**
 * Create a fresh mock database for testing
 */
export async function createMockDatabase(): Promise<MockDatabase> {
  const mock = new MockDatabase();
  await mock.initialize();
  return mock;
}

/**
 * Create a mock database with seed data
 */
export async function createSeededDatabase(
  seedData: DatabaseSeedData
): Promise<{
  mock: MockDatabase;
  recipeIds: string[];
  menuIds: string[];
}> {
  const mock = new MockDatabase();
  await mock.initialize();
  const { recipeIds, menuIds } = await mock.seed(seedData);
  return { mock, recipeIds, menuIds };
}

/**
 * Test helper to create a database with recipes
 */
export async function createDatabaseWithRecipes(
  recipes: RecipeInput[]
): Promise<{
  db: Database;
  recipeIds: string[];
  cleanup: () => void;
}> {
  const db = await createDatabase();
  const repo = new RecipeRepository(db);
  const recipeIds: string[] = [];

  for (const recipe of recipes) {
    const created = repo.createRecipe(recipe);
    recipeIds.push(created.id);
  }

  return {
    db,
    recipeIds,
    cleanup: () => db.close(),
  };
}

/**
 * Pre-built seed data configurations
 */
export const seedConfigs = {
  /** Empty database */
  empty: {} as DatabaseSeedData,

  /** Minimal data for basic tests */
  minimal: {
    recipes: [
      {
        title: 'Test Recipe 1',
        ingredients: [{ name: 'ingredient 1', quantity: 1, unit: 'cup' as const }],
        instructions: [{ text: 'Step 1' }],
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 4,
      },
    ],
  } as DatabaseSeedData,

  /** Standard test data */
  standard: {
    recipes: [
      {
        title: 'Breakfast Recipe',
        ingredients: [
          { name: 'eggs', quantity: 3, unit: 'piece' as const },
          { name: 'butter', quantity: 1, unit: 'tbsp' as const },
        ],
        instructions: [{ text: 'Cook eggs' }],
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 2,
        tags: ['breakfast', 'quick'],
      },
      {
        title: 'Lunch Recipe',
        ingredients: [
          { name: 'bread', quantity: 2, unit: 'piece' as const },
          { name: 'cheese', quantity: 2, unit: 'oz' as const },
        ],
        instructions: [{ text: 'Make sandwich' }],
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 1,
        tags: ['lunch', 'quick'],
      },
      {
        title: 'Dinner Recipe',
        ingredients: [
          { name: 'chicken', quantity: 1, unit: 'lb' as const },
          { name: 'vegetables', quantity: 2, unit: 'cup' as const },
        ],
        instructions: [{ text: 'Cook chicken' }, { text: 'Add vegetables' }],
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        servings: 4,
        tags: ['dinner', 'healthy'],
      },
    ],
    preferences: {
      unitSystem: 'us',
      defaultServings: '4',
    },
  } as DatabaseSeedData,

  /** Large dataset for performance testing */
  large: {
    recipes: Array.from({ length: 100 }, (_, i) => ({
      title: `Recipe ${i + 1}`,
      ingredients: Array.from({ length: 5 + (i % 10) }, (_, j) => ({
        name: `Ingredient ${j + 1}`,
        quantity: (j + 1) * 0.5,
        unit: ['cup', 'tbsp', 'tsp', 'oz', 'g'][j % 5] as const,
      })),
      instructions: Array.from({ length: 3 + (i % 5) }, (_, j) => ({
        text: `Step ${j + 1} for recipe ${i + 1}`,
      })),
      prepTimeMinutes: 10 + (i % 20),
      cookTimeMinutes: 20 + (i % 40),
      servings: 2 + (i % 6),
      tags: [`tag-${i % 10}`, `category-${i % 5}`],
    })),
  } as DatabaseSeedData,
};
