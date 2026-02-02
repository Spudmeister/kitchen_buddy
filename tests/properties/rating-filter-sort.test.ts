/**
 * Property Test: Rating Filter and Sort
 * 
 * **Feature: sous-chef, Property 25: Rating Filter and Sort**
 * **Validates: Requirements 13.3**
 * 
 * For any minimum rating filter, searching with that filter SHALL return only recipes
 * with ratings greater than or equal to the filter value. Sorting by rating SHALL
 * order recipes by rating value.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, ratingValueArb } from '../generators/recipe-generators.js';

describe('Property 25: Rating Filter and Sort', () => {
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

  it('should filter recipes by minimum rating', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 15 }),
        ratingValueArb,
        (recipeInputs, minRating) => {
          // Create recipes with various ratings
          const recipeRatings = new Map<string, number>();
          const createdRecipeIds = new Set<string>();
          
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
            recipeRatings.set(recipe.id, rating);
            createdRecipeIds.add(recipe.id);
          }

          // Filter by minimum rating
          const filteredIds = statsService.getRecipeIdsByMinRating(minRating);

          // Only check recipes we created in this test
          const filteredCreatedIds = filteredIds.filter(id => createdRecipeIds.has(id));

          // Verify all returned recipes (that we created) have rating >= minRating
          for (const recipeId of filteredCreatedIds) {
            const rating = recipeRatings.get(recipeId);
            expect(rating).toBeDefined();
            expect(rating).toBeGreaterThanOrEqual(minRating);
          }

          // Verify no recipes with rating >= minRating are missing
          for (const [recipeId, rating] of recipeRatings) {
            if (rating >= minRating) {
              expect(filteredIds).toContain(recipeId);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should sort recipes by rating in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 3, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes with various ratings
          const recipeRatings = new Map<string, number>();
          const createdRecipeIds = new Set<string>();
          
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
            recipeRatings.set(recipe.id, rating);
            createdRecipeIds.add(recipe.id);
          }

          // Sort by rating descending
          const sortedIds = statsService.getRecipeIdsSortedByRating('desc');

          // Filter to only recipes we created
          const sortedCreatedIds = sortedIds.filter(id => createdRecipeIds.has(id));

          // Verify descending order
          for (let i = 1; i < sortedCreatedIds.length; i++) {
            const prevRating = recipeRatings.get(sortedCreatedIds[i - 1]!)!;
            const currRating = recipeRatings.get(sortedCreatedIds[i]!)!;
            expect(prevRating).toBeGreaterThanOrEqual(currRating);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should sort recipes by rating in ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 3, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes with various ratings
          const recipeRatings = new Map<string, number>();
          const createdRecipeIds = new Set<string>();
          
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
            recipeRatings.set(recipe.id, rating);
            createdRecipeIds.add(recipe.id);
          }

          // Sort by rating ascending
          const sortedIds = statsService.getRecipeIdsSortedByRating('asc');

          // Filter to only recipes we created
          const sortedCreatedIds = sortedIds.filter(id => createdRecipeIds.has(id));

          // Verify ascending order
          for (let i = 1; i < sortedCreatedIds.length; i++) {
            const prevRating = recipeRatings.get(sortedCreatedIds[i - 1]!)!;
            const currRating = recipeRatings.get(sortedCreatedIds[i]!)!;
            expect(prevRating).toBeLessThanOrEqual(currRating);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should combine filter and sort correctly', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 5, maxLength: 15 }),
        ratingValueArb,
        (recipeInputs, minRating) => {
          // Create recipes with various ratings
          const recipeRatings = new Map<string, number>();
          const createdRecipeIds = new Set<string>();
          
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            const rating = ((i % 5) + 1); // Cycle through 1-5
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
            recipeRatings.set(recipe.id, rating);
            createdRecipeIds.add(recipe.id);
          }

          // Filter and sort
          const filteredSortedIds = statsService.filterRecipesByRating({
            minRating,
            sortBy: 'rating',
            sortOrder: 'desc',
          });

          // Filter to only recipes we created
          const filteredCreatedIds = filteredSortedIds.filter(id => createdRecipeIds.has(id));

          // Verify all returned recipes (that we created) have rating >= minRating
          for (const recipeId of filteredCreatedIds) {
            const rating = recipeRatings.get(recipeId);
            expect(rating).toBeDefined();
            expect(rating).toBeGreaterThanOrEqual(minRating);
          }

          // Verify descending order
          for (let i = 1; i < filteredCreatedIds.length; i++) {
            const prevRating = recipeRatings.get(filteredCreatedIds[i - 1]!)!;
            const currRating = recipeRatings.get(filteredCreatedIds[i]!)!;
            expect(prevRating).toBeGreaterThanOrEqual(currRating);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should use the most recent rating for filtering', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(ratingValueArb, { minLength: 2, maxLength: 5 }),
        ratingValueArb,
        (recipeInput, ratings, minRating) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe multiple times
          for (const rating of ratings) {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating,
            });
          }

          // The most recent rating is the last one
          const mostRecentRating = ratings[ratings.length - 1]!;

          // Filter by minimum rating
          const filteredIds = statsService.getRecipeIdsByMinRating(minRating);

          // Recipe should be included if most recent rating >= minRating
          if (mostRecentRating >= minRating) {
            expect(filteredIds).toContain(recipe.id);
          } else {
            expect(filteredIds).not.toContain(recipe.id);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return empty array when no recipes match filter', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes with low ratings (1-2)
          for (const input of recipeInputs) {
            const recipe = recipeService.createRecipe(input);
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating: 1, // All recipes get rating 1
            });
          }

          // Filter by minimum rating 5 (none should match)
          const filteredIds = statsService.getRecipeIdsByMinRating(5);

          // Should return empty array
          expect(filteredIds).toEqual([]);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should only include rated recipes in results', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 4, maxLength: 10 }),
        (recipeInputs) => {
          // Create recipes, only rate half of them
          const ratedRecipeIds = new Set<string>();
          const allCreatedRecipeIds = new Set<string>();
          
          for (let i = 0; i < recipeInputs.length; i++) {
            const recipe = recipeService.createRecipe(recipeInputs[i]!);
            allCreatedRecipeIds.add(recipe.id);
            if (i % 2 === 0) {
              statsService.rateRecipe({
                recipeId: recipe.id,
                rating: 5,
              });
              ratedRecipeIds.add(recipe.id);
            }
          }

          // Get all rated recipes sorted
          const sortedIds = statsService.getRecipeIdsSortedByRating('desc');

          // Filter to only recipes we created in this test
          const sortedCreatedIds = sortedIds.filter(id => allCreatedRecipeIds.has(id));

          // Should only include rated recipes from this test
          expect(sortedCreatedIds.length).toBe(ratedRecipeIds.size);
          for (const id of sortedCreatedIds) {
            expect(ratedRecipeIds.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
