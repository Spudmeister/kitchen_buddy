/**
 * Property Test: Cook Time Statistics Calculation
 * 
 * **Feature: sous-chef, Property 22: Cook Time Statistics Calculation**
 * **Validates: Requirements 12.2, 12.4**
 * 
 * For any recipe with N cook sessions (N > 0), the statistics SHALL correctly calculate:
 * average = sum/N, minimum = smallest value, maximum = largest value, and times cooked = N.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, cookSessionWithTimesArb } from '../generators/recipe-generators.js';

describe('Property 22: Cook Time Statistics Calculation', () => {
  let db: Database;
  let recipeService: RecipeService;
  let statsService: StatisticsService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    statsService = new StatisticsService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should correctly calculate times cooked count', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 20 }),
        (recipeInput, numSessions) => {
          const recipe = recipeService.createRecipe(recipeInput);

          // Log N sessions
          for (let i = 0; i < numSessions; i++) {
            statsService.logCookSession({
              recipeId: recipe.id,
              date: new Date(2025, 0, i + 1),
              servingsMade: 4,
            });
          }

          // Get stats
          const stats = statsService.getCookStats(recipe.id);

          // Verify times cooked equals N
          expect(stats.timesCooked).toBe(numSessions);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly calculate average, min, and max prep times', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(fc.integer({ min: 1, max: 480 }), { minLength: 1, maxLength: 20 }),
        (recipeInput, prepTimes) => {
          const recipe = recipeService.createRecipe(recipeInput);

          // Log sessions with specific prep times
          for (let i = 0; i < prepTimes.length; i++) {
            statsService.logCookSession({
              recipeId: recipe.id,
              date: new Date(2025, 0, i + 1),
              actualPrepMinutes: prepTimes[i],
              servingsMade: 4,
            });
          }

          // Get stats
          const stats = statsService.getCookStats(recipe.id);

          // Calculate expected values
          const expectedMin = Math.min(...prepTimes);
          const expectedMax = Math.max(...prepTimes);
          const expectedAvg = Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length);

          // Verify statistics
          expect(stats.minPrepTime?.minutes).toBe(expectedMin);
          expect(stats.maxPrepTime?.minutes).toBe(expectedMax);
          expect(stats.avgPrepTime?.minutes).toBe(expectedAvg);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly calculate average, min, and max cook times', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(fc.integer({ min: 1, max: 480 }), { minLength: 1, maxLength: 20 }),
        (recipeInput, cookTimes) => {
          const recipe = recipeService.createRecipe(recipeInput);

          // Log sessions with specific cook times
          for (let i = 0; i < cookTimes.length; i++) {
            statsService.logCookSession({
              recipeId: recipe.id,
              date: new Date(2025, 0, i + 1),
              actualCookMinutes: cookTimes[i],
              servingsMade: 4,
            });
          }

          // Get stats
          const stats = statsService.getCookStats(recipe.id);

          // Calculate expected values
          const expectedMin = Math.min(...cookTimes);
          const expectedMax = Math.max(...cookTimes);
          const expectedAvg = Math.round(cookTimes.reduce((a, b) => a + b, 0) / cookTimes.length);

          // Verify statistics
          expect(stats.minCookTime?.minutes).toBe(expectedMin);
          expect(stats.maxCookTime?.minutes).toBe(expectedMax);
          expect(stats.avgCookTime?.minutes).toBe(expectedAvg);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should track last cooked date correctly', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }), { minLength: 1, maxLength: 10 }),
        (recipeInput, dates) => {
          const recipe = recipeService.createRecipe(recipeInput);

          // Log sessions with different dates
          for (const date of dates) {
            statsService.logCookSession({
              recipeId: recipe.id,
              date,
              servingsMade: 4,
            });
          }

          // Get stats
          const stats = statsService.getCookStats(recipe.id);

          // Find the most recent date
          const expectedLastCooked = new Date(Math.max(...dates.map(d => d.getTime())));

          // Verify last cooked date
          expect(stats.lastCooked).toBeDefined();
          expect(stats.lastCooked!.toISOString()).toBe(expectedLastCooked.toISOString());
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return zero times cooked for recipes with no sessions', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        const recipe = recipeService.createRecipe(recipeInput);

        // Get stats without logging any sessions
        const stats = statsService.getCookStats(recipe.id);

        // Verify empty stats
        expect(stats.timesCooked).toBe(0);
        expect(stats.lastCooked).toBeUndefined();
        expect(stats.avgPrepTime).toBeUndefined();
        expect(stats.avgCookTime).toBeUndefined();
        expect(stats.minPrepTime).toBeUndefined();
        expect(stats.maxPrepTime).toBeUndefined();
        expect(stats.minCookTime).toBeUndefined();
        expect(stats.maxCookTime).toBeUndefined();
      }),
      { numRuns: 30 }
    );
  });

  it('should handle sessions with only prep time or only cook time', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 480 }),
        (recipeInput, time) => {
          const recipe = recipeService.createRecipe(recipeInput);

          // Log session with only prep time
          statsService.logCookSession({
            recipeId: recipe.id,
            date: new Date('2025-01-01'),
            actualPrepMinutes: time,
            servingsMade: 4,
          });

          // Log session with only cook time
          statsService.logCookSession({
            recipeId: recipe.id,
            date: new Date('2025-01-02'),
            actualCookMinutes: time,
            servingsMade: 4,
          });

          // Get stats
          const stats = statsService.getCookStats(recipe.id);

          // Verify times cooked
          expect(stats.timesCooked).toBe(2);

          // Verify prep time stats (only 1 session has prep time)
          expect(stats.avgPrepTime?.minutes).toBe(time);
          expect(stats.minPrepTime?.minutes).toBe(time);
          expect(stats.maxPrepTime?.minutes).toBe(time);

          // Verify cook time stats (only 1 session has cook time)
          expect(stats.avgCookTime?.minutes).toBe(time);
          expect(stats.minCookTime?.minutes).toBe(time);
          expect(stats.maxCookTime?.minutes).toBe(time);
        }
      ),
      { numRuns: 30 }
    );
  });
});
