/**
 * Property Test: Favorites Recommendation
 *
 * **Feature: sous-chef, Property 27: Favorites Recommendation**
 * **Validates: Requirements 13.4, 15.2**
 *
 * For any request for favorites, the returned recipes SHALL have high ratings
 * (≥4 stars) AND high cook frequency (above median), sorted by a combination
 * of both factors.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { RecommendationService } from '../../src/services/recommendation-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 27: Favorites Recommendation', () => {
  let db: Database;
  let recipeService: RecipeService;
  let statsService: StatisticsService;
  let recommendationService: RecommendationService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    statsService = new StatisticsService(db);
    recommendationService = new RecommendationService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should return only recipes with rating >= 4', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes with various ratings and cook counts
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({ recipeId: recipe.id, rating });
            createdRecipeIds.add(recipe.id);

            // Log cook sessions (enough to be above median)
            for (let j = 0; j < 5; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
          }

          // Get favorites
          const favorites = recommendationService.getFavorites();

          // Filter to only recipes we created in this test
          const testFavorites = favorites.filter(r => createdRecipeIds.has(r.id));

          // All returned recipes must have rating >= 4
          for (const recipe of testFavorites) {
            expect(recipe.rating).toBeDefined();
            expect(recipe.rating).toBeGreaterThanOrEqual(4);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return only recipes with cook frequency above median', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 6, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes all with high ratings but varying cook counts
          const recipeCookCounts = new Map<string, number>();
          const createdRecipeIds = new Set<string>();

          // Create distinct cook count groups: low (0-2) and high (10+)
          // This ensures a clear separation above/below median
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            // All recipes get rating 5 (high rating)
            statsService.rateRecipe({ recipeId: recipe.id, rating: 5 });
            createdRecipeIds.add(recipe.id);

            // Half get low cook counts (0-2), half get high (10+)
            const isHighFrequency = i >= recipeInputs.length / 2;
            const cookCount = isHighFrequency ? 10 + i : i % 3;
            
            for (let j = 0; j < cookCount; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
            recipeCookCounts.set(recipe.id, cookCount);
          }

          // Get favorites
          const favorites = recommendationService.getFavorites();

          // Filter to only recipes we created in this test
          const testFavorites = favorites.filter(r => createdRecipeIds.has(r.id));

          // All returned favorites should be from the high-frequency group
          // (cook count >= 10, which is clearly above any reasonable median)
          for (const recipe of testFavorites) {
            const cookCount = recipeCookCounts.get(recipe.id);
            expect(cookCount).toBeDefined();
            // High frequency recipes should have cook count >= 10
            expect(cookCount).toBeGreaterThanOrEqual(10);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return empty array when no recipes have rating >= 4', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes with low ratings (1-3)
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = (i % 3) + 1; // Cycle through 1-3
            statsService.rateRecipe({ recipeId: recipe.id, rating });

            // Add some cook sessions
            statsService.logCookSession({
              recipeId: recipe.id,
              date: new Date(),
              servingsMade: 4,
            });
          }

          // Get favorites
          const favorites = recommendationService.getFavorites();

          // Should return empty array
          expect(favorites).toEqual([]);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should respect the limit parameter', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 10, maxLength: 15 }),
        fc.integer({ min: 1, max: 5 }),
        (recipeInputs, limit) => {
          // Create many recipes with high ratings and cook counts
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            statsService.rateRecipe({ recipeId: recipe.id, rating: 5 });

            // High cook count for all
            for (let j = 0; j < 10; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
          }

          // Get favorites with limit
          const favorites = recommendationService.getFavorites(limit);

          // Should not exceed limit
          expect(favorites.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort by combined rating and cook frequency score', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 8 }),
        (recipeInputs) => {
          // Create recipes with varying ratings (4-5) and cook counts
          const recipeScores = new Map<string, number>();
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = i % 2 === 0 ? 5 : 4; // Alternate between 4 and 5
            statsService.rateRecipe({ recipeId: recipe.id, rating });
            createdRecipeIds.add(recipe.id);

            // Varying cook counts that ensure above median
            const cookCount = 5 + i * 2;
            for (let j = 0; j < cookCount; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }

            // Score = rating * cookCount
            recipeScores.set(recipe.id, rating * cookCount);
          }

          // Get favorites
          const favorites = recommendationService.getFavorites();

          // Filter to only recipes we created in this test
          const testFavorites = favorites.filter(r => createdRecipeIds.has(r.id));

          // Verify descending order by score
          for (let i = 1; i < testFavorites.length; i++) {
            const prevScore = recipeScores.get(testFavorites[i - 1]!.id) ?? 0;
            const currScore = recipeScores.get(testFavorites[i]!.id) ?? 0;
            expect(prevScore).toBeGreaterThanOrEqual(currScore);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
