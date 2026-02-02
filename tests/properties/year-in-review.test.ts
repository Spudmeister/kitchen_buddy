/**
 * Property Test: Year in Review Accuracy
 * 
 * **Feature: sous-chef, Property 30: Year in Review Accuracy**
 * **Validates: Requirements 14.3**
 * 
 * For any year with cook sessions, the year in review SHALL include only sessions
 * from that year, and all calculated statistics SHALL be accurate for that year's data.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { TagService } from '../../src/services/tag-service.js';
import { minimalRecipeInputArb, tagArb } from '../generators/recipe-generators.js';

describe('Property 30: Year in Review Accuracy', () => {
  it('should include only sessions from the specified year', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 2020, max: 2030 }),
        async (recipeInput, targetYear) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create a recipe
            const recipe = recipeService.createRecipe(recipeInput);

            // Log sessions in different years
            const sessionsInTargetYear = 3;
            const sessionsOutsideYear = 2;

            // Sessions in target year
            for (let i = 0; i < sessionsInTargetYear; i++) {
              const month = (i % 12) + 1;
              const day = (i % 28) + 1;
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(`${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
                servingsMade: 4,
              });
            }

            // Sessions outside target year (previous year)
            for (let i = 0; i < sessionsOutsideYear; i++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(`${targetYear - 1}-06-${String((i % 28) + 1).padStart(2, '0')}`),
                servingsMade: 4,
              });
            }

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify only sessions from target year are counted
            expect(review.year).toBe(targetYear);
            expect(review.totalCookSessions).toBe(sessionsInTargetYear);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly count unique recipes cooked in the year', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 2020, max: 2030 }),
        async (recipeInputs, targetYear) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Cook some recipes in target year, some outside
            const recipesToCookInYear = recipes.slice(0, Math.ceil(recipes.length / 2));
            const recipesToCookOutsideYear = recipes.slice(Math.ceil(recipes.length / 2));

            // Log sessions in target year
            for (const recipe of recipesToCookInYear) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(`${targetYear}-03-15`),
                servingsMade: 4,
              });
            }

            // Log sessions outside target year
            for (const recipe of recipesToCookOutsideYear) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(`${targetYear - 1}-03-15`),
                servingsMade: 4,
              });
            }

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify unique recipes count
            expect(review.uniqueRecipesCooked).toBe(recipesToCookInYear.length);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly calculate monthly activity breakdown', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 2020, max: 2030 }),
        async (recipeInput, targetYear) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create a recipe
            const recipe = recipeService.createRecipe(recipeInput);

            // Log sessions in specific months
            const expectedMonthlyCounts = new Map<number, number>();
            
            // January: 2 sessions
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-01-10`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-01-20`), servingsMade: 4 });
            expectedMonthlyCounts.set(1, 2);

            // March: 1 session
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-15`), servingsMade: 4 });
            expectedMonthlyCounts.set(3, 1);

            // July: 3 sessions
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-07-05`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-07-15`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-07-25`), servingsMade: 4 });
            expectedMonthlyCounts.set(7, 3);

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify monthly activity
            expect(review.monthlyActivity.length).toBe(12);
            
            for (const monthStats of review.monthlyActivity) {
              const expectedCount = expectedMonthlyCounts.get(monthStats.month) ?? 0;
              expect(monthStats.cookSessions).toBe(expectedCount);
            }
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should correctly calculate total time spent cooking', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 2020, max: 2030 }),
        fc.array(fc.record({
          prepMinutes: fc.integer({ min: 5, max: 60 }),
          cookMinutes: fc.integer({ min: 10, max: 120 }),
        }), { minLength: 1, maxLength: 5 }),
        async (recipeInput, targetYear, sessionTimes) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create a recipe
            const recipe = recipeService.createRecipe(recipeInput);

            // Log sessions with times
            let expectedTotalMinutes = 0;
            sessionTimes.forEach((times, index) => {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(`${targetYear}-${String((index % 12) + 1).padStart(2, '0')}-15`),
                actualPrepMinutes: times.prepMinutes,
                actualCookMinutes: times.cookMinutes,
                servingsMade: 4,
              });
              expectedTotalMinutes += times.prepMinutes + times.cookMinutes;
            });

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify total time
            expect(review.totalTimeSpentCooking.minutes).toBe(expectedTotalMinutes);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly sort top recipes by cook count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 3, maxLength: 6 }),
        fc.integer({ min: 2020, max: 2030 }),
        async (recipeInputs, targetYear) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create recipes
            const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

            // Log different numbers of sessions for each recipe
            const cookCounts = new Map<string, number>();
            recipes.forEach((recipe, index) => {
              const numSessions = index + 1;
              for (let i = 0; i < numSessions; i++) {
                statsService.logCookSession({
                  recipeId: recipe.id,
                  date: new Date(`${targetYear}-${String((i % 12) + 1).padStart(2, '0')}-15`),
                  servingsMade: 4,
                });
              }
              cookCounts.set(recipe.id, numSessions);
            });

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify top recipes are sorted by count (descending)
            for (let i = 1; i < review.topRecipes.length; i++) {
              expect(review.topRecipes[i - 1]!.count).toBeGreaterThanOrEqual(
                review.topRecipes[i]!.count
              );
            }

            // Verify counts are correct
            for (const recipeCount of review.topRecipes) {
              expect(recipeCount.count).toBe(cookCounts.get(recipeCount.recipeId));
            }
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly calculate longest cooking streak', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 2020, max: 2030 }),
        async (recipeInput, targetYear) => {
          const db = await createDatabase();
          const recipeService = new RecipeService(db);
          const statsService = new StatisticsService(db);

          try {
            // Create a recipe
            const recipe = recipeService.createRecipe(recipeInput);

            // Log sessions with a known streak pattern
            // Streak 1: 3 consecutive days (Jan 10-12)
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-01-10`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-01-11`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-01-12`), servingsMade: 4 });

            // Gap

            // Streak 2: 5 consecutive days (Mar 1-5) - longest
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-01`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-02`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-03`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-04`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-03-05`), servingsMade: 4 });

            // Gap

            // Streak 3: 2 consecutive days (Jun 20-21)
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-06-20`), servingsMade: 4 });
            statsService.logCookSession({ recipeId: recipe.id, date: new Date(`${targetYear}-06-21`), servingsMade: 4 });

            // Get year in review
            const review = statsService.getYearInReview(targetYear);

            // Verify longest streak is 5
            expect(review.longestStreak).toBe(5);
          } finally {
            db.close();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
