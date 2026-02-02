/**
 * Property Test: Recipe Suggestion by Ingredients
 *
 * **Feature: sous-chef, Property 17: Recipe Suggestion by Ingredients**
 * **Validates: Requirements 7.2, 7.4**
 *
 * For any set of available ingredients, suggested recipes SHALL be makeable
 * with those ingredients (possibly with some missing), and SHALL be ordered
 * by the number of missing ingredients (ascending).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { SubstitutionService } from '../../src/services/substitution-service.js';
import { minimalRecipeInputArb, ingredientInputArb } from '../generators/recipe-generators.js';

describe('Property 17: Recipe Suggestion by Ingredients', () => {
  let db: Database;
  let recipeService: RecipeService;
  let substitutionService: SubstitutionService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    substitutionService = new SubstitutionService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should return recipes ordered by missing ingredient count (ascending)', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 3, maxLength: 8 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        (recipeInputs, availableIngredients) => {
          // Create recipes
          for (const input of recipeInputs) {
            recipeService.createRecipe(input);
          }

          // Get suggestions
          const suggestions = substitutionService.suggestRecipesByIngredients(availableIngredients);

          // Verify ordering: missing count should be non-decreasing
          for (let i = 1; i < suggestions.length; i++) {
            const prev = suggestions[i - 1]!;
            const curr = suggestions[i]!;
            expect(curr.missingCount).toBeGreaterThanOrEqual(prev.missingCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify matched and missing ingredients', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        (recipeInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Use some of the recipe's actual ingredients as available
          const recipeIngredientNames = recipe.ingredients.map(i => i.name);
          const halfIndex = Math.floor(recipeIngredientNames.length / 2);
          const availableIngredients = recipeIngredientNames.slice(0, halfIndex);

          // Get suggestions
          const suggestions = substitutionService.suggestRecipesByIngredients(availableIngredients);

          // Find our recipe in suggestions
          const ourSuggestion = suggestions.find(s => s.recipe.id === recipe.id);
          
          if (ourSuggestion) {
            // Total should equal recipe's ingredient count
            const totalInSuggestion = ourSuggestion.matchedIngredients.length + ourSuggestion.missingIngredients.length;
            expect(totalInSuggestion).toBe(recipe.ingredients.length);

            // Missing count should match missingIngredients array length
            expect(ourSuggestion.missingCount).toBe(ourSuggestion.missingIngredients.length);

            // Match score should be between 0 and 1
            expect(ourSuggestion.matchScore).toBeGreaterThanOrEqual(0);
            expect(ourSuggestion.matchScore).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return exact matches (0 missing) when all ingredients are available', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        (recipeInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Use ALL of the recipe's ingredients as available
          const availableIngredients = recipe.ingredients.map(i => i.name);

          // Get suggestions
          const suggestions = substitutionService.suggestRecipesByIngredients(availableIngredients);

          // Find our recipe in suggestions
          const ourSuggestion = suggestions.find(s => s.recipe.id === recipe.id);

          // Should be found with 0 missing ingredients
          expect(ourSuggestion).toBeDefined();
          if (ourSuggestion) {
            expect(ourSuggestion.missingCount).toBe(0);
            expect(ourSuggestion.matchScore).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect the limit parameter', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 10, maxLength: 15 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }),
        (recipeInputs, limit, availableIngredients) => {
          // Create recipes
          for (const input of recipeInputs) {
            recipeService.createRecipe(input);
          }

          // Get suggestions with limit
          const suggestions = substitutionService.suggestRecipesByIngredients(availableIngredients, limit);

          // Should not exceed limit
          expect(suggestions.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find exact matches when using findExactMatches', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Pick one recipe and use all its ingredients
          const targetRecipe = recipes[0]!;
          const availableIngredients = targetRecipe.ingredients.map(i => i.name);

          // Find exact matches
          const exactMatches = substitutionService.findExactMatches(availableIngredients);

          // Target recipe should be in exact matches
          const found = exactMatches.some(r => r.id === targetRecipe.id);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by max missing ingredients correctly', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 3, maxLength: 8 }),
        fc.integer({ min: 0, max: 3 }),
        fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        (recipeInputs, maxMissing, availableIngredients) => {
          // Create recipes
          for (const input of recipeInputs) {
            recipeService.createRecipe(input);
          }

          // Get suggestions with max missing filter
          const suggestions = substitutionService.findWithMaxMissing(availableIngredients, maxMissing);

          // All suggestions should have at most maxMissing missing ingredients
          for (const suggestion of suggestions) {
            expect(suggestion.missingCount).toBeLessThanOrEqual(maxMissing);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not include archived recipes in suggestions', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Archive the first recipe
          const archivedRecipe = recipes[0]!;
          recipeService.archiveRecipe(archivedRecipe.id);

          // Use all ingredients from archived recipe
          const availableIngredients = archivedRecipe.ingredients.map(i => i.name);

          // Get suggestions
          const suggestions = substitutionService.suggestRecipesByIngredients(availableIngredients);

          // Archived recipe should NOT be in suggestions
          const found = suggestions.some(s => s.recipe.id === archivedRecipe.id);
          expect(found).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
