/**
 * Property Test: Rating History Tracking
 * 
 * **Feature: sous-chef, Property 26: Rating History Tracking**
 * **Validates: Requirements 13.5**
 * 
 * For any recipe that is rated multiple times, all ratings SHALL be stored with timestamps,
 * and the history SHALL be retrievable in chronological order.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, ratingValueArb } from '../generators/recipe-generators.js';

describe('Property 26: Rating History Tracking', () => {
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

  it('should store all ratings in history', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(ratingValueArb, { minLength: 1, maxLength: 20 }),
        (recipeInput, ratings) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe multiple times
          for (const rating of ratings) {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
          }

          // Get rating history
          const history = statsService.getRatingHistory(recipe.id);

          // Verify all ratings are stored
          expect(history.length).toBe(ratings.length);

          // Verify all rating values are present
          const historyRatings = history.map(h => h.rating);
          expect(historyRatings).toEqual(ratings);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return history in chronological order (ascending)', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(ratingValueArb, { minLength: 2, maxLength: 10 }),
        (recipeInput, ratings) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe multiple times
          for (const rating of ratings) {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
          }

          // Get rating history
          const history = statsService.getRatingHistory(recipe.id);

          // Verify chronological order (ascending by ratedAt)
          for (let i = 1; i < history.length; i++) {
            expect(history[i - 1]!.ratedAt.getTime()).toBeLessThanOrEqual(history[i]!.ratedAt.getTime());
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include timestamps for all ratings', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(ratingValueArb, { minLength: 1, maxLength: 10 }),
        (recipeInput, ratings) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe multiple times
          for (const rating of ratings) {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
          }

          // Get rating history
          const history = statsService.getRatingHistory(recipe.id);

          // Verify all entries have valid timestamps
          for (const entry of history) {
            expect(entry.ratedAt).toBeInstanceOf(Date);
            expect(entry.ratedAt.getTime()).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return empty history for unrated recipes', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create a recipe without rating
        const recipe = recipeService.createRecipe(recipeInput);

        // Get rating history
        const history = statsService.getRatingHistory(recipe.id);

        // Verify empty history
        expect(history).toEqual([]);
      }),
      { numRuns: 30 }
    );
  });

  it('should maintain separate histories for different recipes', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Rate each recipe a different number of times
          const expectedCounts = new Map<string, number>();
          for (let i = 0; i < recipes.length; i++) {
            const numRatings = i + 1; // 1, 2, 3, etc.
            for (let j = 0; j < numRatings; j++) {
              statsService.rateRecipe({
                recipeId: recipes[i]!.id,
                rating: ((j % 5) + 1), // Cycle through 1-5
              });
            }
            expectedCounts.set(recipes[i]!.id, numRatings);
          }

          // Verify each recipe has its own history
          for (const recipe of recipes) {
            const history = statsService.getRatingHistory(recipe.id);
            expect(history.length).toBe(expectedCounts.get(recipe.id));
            
            // Verify all entries belong to this recipe
            for (const entry of history) {
              expect(entry.recipeId).toBe(recipe.id);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve rating values exactly', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(ratingValueArb, { minLength: 1, maxLength: 10 }),
        (recipeInput, ratings) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe with specific values
          for (const rating of ratings) {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
          }

          // Get rating history
          const history = statsService.getRatingHistory(recipe.id);

          // Verify each rating value is preserved exactly
          for (let i = 0; i < ratings.length; i++) {
            expect(history[i]!.rating).toBe(ratings[i]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
