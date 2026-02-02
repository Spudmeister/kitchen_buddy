/**
 * Property Test: Statistics Tracking Completeness
 * 
 * **Feature: sous-chef, Property 29: Statistics Tracking Completeness**
 * **Validates: Requirements 14.1, 14.2, 14.4, 14.6**
 * 
 * For any set of cook sessions, the personal statistics SHALL correctly report:
 * total cook sessions, unique recipes cooked, most-cooked recipes (sorted by frequency),
 * and most-used tags (sorted by frequency).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { TagService } from '../../src/services/tag-service.js';
import { minimalRecipeInputArb, tagArb } from '../generators/recipe-generators.js';

describe('Property 29: Statistics Tracking Completeness', () => {
  it('should correctly report total cook sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (recipeInputs, sessionsPerRecipe) => {
          // Create fresh database for each test
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Log cook sessions for each recipe
            let expectedTotalSessions = 0;
            for (const recipe of recipes) {
              for (let i = 0; i < sessionsPerRecipe; i++) {
                statsService.logCookSession({
                  recipeId: recipe.id,
                  date: new Date(),
                  servingsMade: 4,
                });
                expectedTotalSessions++;
              }
            }

            // Get personal stats
            const stats = statsService.getPersonalStats();

            // Verify total cook sessions
            expect(stats.totalCookSessions).toBe(expectedTotalSessions);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly report unique recipes cooked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 10 }),
        async (recipeInputs) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Randomly select some recipes to cook (at least 1)
            const numToCook = Math.max(1, Math.floor(Math.random() * recipes.length));
            const cookedRecipeIds = new Set<string>();

            for (let i = 0; i < numToCook; i++) {
              const recipe = recipes[i % recipes.length]!;
              // Log 1-3 sessions per recipe
              const numSessions = Math.floor(Math.random() * 3) + 1;
              for (let j = 0; j < numSessions; j++) {
                statsService.logCookSession({
                  recipeId: recipe.id,
                  date: new Date(),
                  servingsMade: 4,
                });
              }
              cookedRecipeIds.add(recipe.id);
            }

            // Get personal stats
            const stats = statsService.getPersonalStats();

            // Verify unique recipes cooked
            expect(stats.uniqueRecipesCooked).toBe(cookedRecipeIds.size);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly sort most-cooked recipes by frequency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        async (recipeInputs) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Log different numbers of sessions for each recipe
            const cookCounts = new Map<string, number>();
            recipes.forEach((recipe, index) => {
              // Each recipe gets a different number of sessions (index + 1)
              const numSessions = index + 1;
              for (let i = 0; i < numSessions; i++) {
                statsService.logCookSession({
                  recipeId: recipe.id,
                  date: new Date(),
                  servingsMade: 4,
                });
              }
              cookCounts.set(recipe.id, numSessions);
            });

            // Get personal stats
            const stats = statsService.getPersonalStats();

            // Verify most-cooked recipes are sorted by frequency (descending)
            for (let i = 1; i < stats.mostCookedRecipes.length; i++) {
              expect(stats.mostCookedRecipes[i - 1]!.count).toBeGreaterThanOrEqual(
                stats.mostCookedRecipes[i]!.count
              );
            }

            // Verify counts are correct
            for (const recipeCount of stats.mostCookedRecipes) {
              expect(recipeCount.count).toBe(cookCounts.get(recipeCount.recipeId));
            }
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly track and sort favorite tags by frequency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        fc.array(tagArb, { minLength: 2, maxLength: 5 }),
        async (recipeInputs, tags) => {
          // Ensure unique tags
          const uniqueTags = [...new Set(tags)];
          if (uniqueTags.length < 2) return; // Skip if not enough unique tags

          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);
          const tagService = new TagService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Assign tags to recipes with different frequencies
            recipes.forEach((recipe, index) => {
              // Assign tags based on index to create different frequencies
              const tagsToAssign = uniqueTags.slice(0, (index % uniqueTags.length) + 1);
              for (const tag of tagsToAssign) {
                tagService.addTag(recipe.id, tag);
              }
            });

            // Log cook sessions for each recipe
            for (const recipe of recipes) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }

            // Calculate expected tag counts from cook sessions
            const tagCounts = new Map<string, number>();
            for (const recipe of recipes) {
              const recipeTags = tagService.getTagsForRecipe(recipe.id);
              for (const tag of recipeTags) {
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
              }
            }

            // Get personal stats
            const stats = statsService.getPersonalStats();

            // Verify favorite tags are sorted by frequency (descending)
            for (let i = 1; i < stats.favoriteTags.length; i++) {
              expect(stats.favoriteTags[i - 1]!.count).toBeGreaterThanOrEqual(
                stats.favoriteTags[i]!.count
              );
            }

            // Verify tag counts are correct
            for (const tagCount of stats.favoriteTags) {
              expect(tagCount.count).toBe(tagCounts.get(tagCount.tag));
            }
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly filter statistics by date range', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        async (recipeInput) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create a recipe
            const recipe = recipeService.createRecipe(recipeInput);

            // Log sessions in different date ranges
            const jan2025 = new Date('2025-01-15');
            const jun2025 = new Date('2025-06-15');
            const dec2025 = new Date('2025-12-15');

            // Log 2 sessions in January
            statsService.logCookSession({ recipeId: recipe.id, date: jan2025, servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date('2025-01-20'), servingsMade: 4 });

            // Log 3 sessions in June
            statsService.logCookSession({ recipeId: recipe.id, date: jun2025, servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date('2025-06-20'), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date('2025-06-25'), servingsMade: 4 });

            // Log 1 session in December
            statsService.logCookSession({ recipeId: recipe.id, date: dec2025, servingsMade: 4 });

            // Get stats for January only
            const janStats = statsService.getPersonalStats({
              start: new Date('2025-01-01'),
              end: new Date('2025-01-31'),
            });
            expect(janStats.totalCookSessions).toBe(2);

            // Get stats for June only
            const junStats = statsService.getPersonalStats({
              start: new Date('2025-06-01'),
              end: new Date('2025-06-30'),
            });
            expect(junStats.totalCookSessions).toBe(3);

            // Get stats for first half of year
            const firstHalfStats = statsService.getPersonalStats({
              start: new Date('2025-01-01'),
              end: new Date('2025-06-30'),
            });
            expect(firstHalfStats.totalCookSessions).toBe(5);

            // Get stats for full year (no filter)
            const fullYearStats = statsService.getPersonalStats();
            expect(fullYearStats.totalCookSessions).toBe(6);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
