/**
 * Property Test: Rating Storage and Retrieval
 * 
 * **Feature: sous-chef, Property 24: Rating Storage and Retrieval**
 * **Validates: Requirements 13.1**
 * 
 * For any recipe and any rating value (1-5), storing the rating SHALL persist it,
 * and the rating SHALL be retrievable and equal to the stored value.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, ratingValueArb } from '../generators/recipe-generators.js';

describe('Property 24: Rating Storage and Retrieval', () => {
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

  it('should store and retrieve ratings with correct values', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        ratingValueArb,
        (recipeInput, rating) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Rate the recipe
          const ratingEntry = statsService.rateRecipe({
            recipeId: recipe.id,
            rating,
          });

          // Verify the rating entry
          expect(ratingEntry.recipeId).toBe(recipe.id);
          expect(ratingEntry.rating).toBe(rating);
          expect(ratingEntry.ratedAt).toBeInstanceOf(Date);

          // Retrieve the current rating
          const currentRating = statsService.getCurrentRating(recipe.id);
          expect(currentRating).toBe(rating);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return the most recent rating as current rating', () => {
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

          // The current rating should be the last one
          const currentRating = statsService.getCurrentRating(recipe.id);
          expect(currentRating).toBe(ratings[ratings.length - 1]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject invalid ratings', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer().filter(n => n < 1 || n > 5),
        (recipeInput, invalidRating) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Attempt to rate with invalid value
          expect(() => {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating: invalidRating,
            });
          }).toThrow('Rating must be an integer between 1 and 5');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject non-integer ratings', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.double({ min: 1.1, max: 4.9, noNaN: true }).filter(n => !Number.isInteger(n)),
        (recipeInput, nonIntegerRating) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Attempt to rate with non-integer value
          expect(() => {
            statsService.rateRecipe({
              recipeId: recipe.id,
              rating: nonIntegerRating,
            });
          }).toThrow('Rating must be an integer between 1 and 5');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return undefined for unrated recipes', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create a recipe without rating
        const recipe = recipeService.createRecipe(recipeInput);

        // Get current rating
        const currentRating = statsService.getCurrentRating(recipe.id);
        expect(currentRating).toBeUndefined();
      }),
      { numRuns: 30 }
    );
  });

  it('should store ratings independently for different recipes', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        fc.array(ratingValueArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs, ratings) => {
          // Create recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Rate each recipe with a different rating
          const recipeRatings = new Map<string, number>();
          for (let i = 0; i < recipes.length; i++) {
            const rating = ratings[i % ratings.length]!;
            statsService.rateRecipe({
              recipeId: recipes[i]!.id,
              rating,
            });
            recipeRatings.set(recipes[i]!.id, rating);
          }

          // Verify each recipe has its own rating
          for (const recipe of recipes) {
            const currentRating = statsService.getCurrentRating(recipe.id);
            expect(currentRating).toBe(recipeRatings.get(recipe.id));
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
