/**
 * Property Test: Deep Cuts Recommendation
 *
 * **Feature: sous-chef, Property 28: Deep Cuts Recommendation**
 * **Validates: Requirements 15.3**
 *
 * For any request for deep cuts, the returned recipes SHALL have good ratings
 * (≥3 stars) AND low cook frequency (below median or never cooked), sorted by rating.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { RecommendationService } from '../../src/services/recommendation-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 28: Deep Cuts Recommendation', () => {
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

  it('should return only recipes with rating >= 3', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes with various ratings
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({ recipeId: recipe.id, rating });
            createdRecipeIds.add(recipe.id);

            // Low cook count (0-1) to ensure below median
            if (i % 2 === 0) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
          }

          // Get deep cuts
          const deepCuts = recommendationService.getDeepCuts();

          // Filter to only recipes we created in this test
          const testDeepCuts = deepCuts.filter(r => createdRecipeIds.has(r.id));

          // All returned recipes must have rating >= 3
          for (const recipe of testDeepCuts) {
            expect(recipe.rating).toBeDefined();
            expect(recipe.rating).toBeGreaterThanOrEqual(3);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return only recipes with low cook frequency', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 6, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes all with good ratings but varying cook counts
          const recipeCookCounts = new Map<string, number>();
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            // All recipes get rating 4 (good rating)
            statsService.rateRecipe({ recipeId: recipe.id, rating: 4 });
            createdRecipeIds.add(recipe.id);

            // Varying cook counts: 0, 1, 2, 3, 4, 5, ...
            const cookCount = i;
            for (let j = 0; j < cookCount; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
            recipeCookCounts.set(recipe.id, cookCount);
          }

          // Calculate median cook count for recipes we created
          const counts = Array.from(recipeCookCounts.values()).sort((a, b) => a - b);
          const medianCookCount = counts[Math.floor(counts.length / 2)]!;

          // Get deep cuts
          const deepCuts = recommendationService.getDeepCuts();

          // Filter to only recipes we created in this test
          const testDeepCuts = deepCuts.filter(r => createdRecipeIds.has(r.id));

          // All returned deep cuts should have cook count <= median
          for (const recipe of testDeepCuts) {
            const cookCount = recipeCookCounts.get(recipe.id);
            expect(cookCount).toBeDefined();
            expect(cookCount).toBeLessThanOrEqual(medianCookCount);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return empty array when no recipes have rating >= 3', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes with low ratings (1-2)
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = (i % 2) + 1; // Cycle through 1-2
            statsService.rateRecipe({ recipeId: recipe.id, rating });
          }

          // Get deep cuts
          const deepCuts = recommendationService.getDeepCuts();

          // Should return empty array
          expect(deepCuts).toEqual([]);
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
          // Create many recipes with good ratings and low cook counts
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            statsService.rateRecipe({ recipeId: recipe.id, rating: 4 });
            // No cook sessions - all are "never cooked"
          }

          // Get deep cuts with limit
          const deepCuts = recommendationService.getDeepCuts(limit);

          // Should not exceed limit
          expect(deepCuts.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should sort by rating in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes with varying ratings (3-5) and low cook counts
          const recipeRatings = new Map<string, number>();
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = (i % 3) + 3; // Cycle through 3, 4, 5
            statsService.rateRecipe({ recipeId: recipe.id, rating });
            recipeRatings.set(recipe.id, rating);
            createdRecipeIds.add(recipe.id);

            // Low cook count (0-1) to ensure below median
            if (i % 3 === 0) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
          }

          // Get deep cuts
          const deepCuts = recommendationService.getDeepCuts();

          // Filter to only recipes we created in this test
          const testDeepCuts = deepCuts.filter(r => createdRecipeIds.has(r.id));

          // Verify descending order by rating
          for (let i = 1; i < testDeepCuts.length; i++) {
            const prevRating = recipeRatings.get(testDeepCuts[i - 1]!.id) ?? 0;
            const currRating = recipeRatings.get(testDeepCuts[i]!.id) ?? 0;
            expect(prevRating).toBeGreaterThanOrEqual(currRating);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should include never-cooked recipes', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 4, maxLength: 8 }),
        (recipeInputs) => {
          // Create recipes with good ratings, some never cooked
          const recipeCookCounts = new Map<string, number>();
          const createdRecipeIds = new Set<string>();

          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            statsService.rateRecipe({ recipeId: recipe.id, rating: 4 });
            createdRecipeIds.add(recipe.id);

            // Half never cooked (0), half cooked once (1)
            const cookCount = i < recipeInputs.length / 2 ? 0 : 1;
            for (let j = 0; j < cookCount; j++) {
              statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
            }
            recipeCookCounts.set(recipe.id, cookCount);
          }

          // Get deep cuts
          const deepCuts = recommendationService.getDeepCuts();

          // Filter to only recipes we created in this test
          const testDeepCuts = deepCuts.filter(r => createdRecipeIds.has(r.id));

          // Never-cooked recipes (cook count = 0) should be included
          // since they are below or equal to median
          const neverCookedInDeepCuts = testDeepCuts.filter(r => 
            recipeCookCounts.get(r.id) === 0
          );
          
          // At least some never-cooked recipes should be in deep cuts
          // (unless there are no never-cooked recipes)
          const neverCookedCount = Array.from(recipeCookCounts.values()).filter(c => c === 0).length;
          if (neverCookedCount > 0 && testDeepCuts.length > 0) {
            expect(neverCookedInDeepCuts.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
