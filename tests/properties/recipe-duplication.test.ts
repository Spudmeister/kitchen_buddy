/**
 * Property Test: Recipe Duplication Preserves Heritage
 *
 * **Feature: sous-chef, Property 31: Recipe Duplication Preserves Heritage**
 * **Validates: Requirements 1.10, 1.11**
 *
 * For any recipe that is duplicated, the new recipe SHALL have a reference to
 * the parent recipe, and the heritage chain SHALL be traversable back to the
 * original recipe.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 31: Recipe Duplication Preserves Heritage', () => {
  let db: Database;
  let service: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    service = new RecipeService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should create duplicate with reference to parent recipe', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create original recipe
        const original = service.createRecipe(recipeInput);

        // Duplicate the recipe
        const duplicate = service.duplicateRecipe(original.id);

        // Duplicate should have a reference to the parent
        expect(duplicate.parentRecipeId).toBe(original.id);

        // Duplicate should be a new recipe with different ID
        expect(duplicate.id).not.toBe(original.id);

        // Duplicate should have "(Copy)" appended to title
        expect(duplicate.title).toBe(`${original.title} (Copy)`);

        // Duplicate should have same content as original
        expect(duplicate.ingredients.length).toBe(original.ingredients.length);
        expect(duplicate.instructions.length).toBe(original.instructions.length);
        expect(duplicate.servings).toBe(original.servings);
        expect(duplicate.prepTime.minutes).toBe(original.prepTime.minutes);
        expect(duplicate.cookTime.minutes).toBe(original.cookTime.minutes);
      }),
      { numRuns: 100 }
    );
  });

  it('should allow traversing heritage chain back to original', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 5 }),
        (recipeInput, chainLength) => {
          // Create original recipe
          const original = service.createRecipe(recipeInput);

          // Create a chain of duplicates
          const chain: string[] = [original.id];
          let currentId = original.id;
          for (let i = 0; i < chainLength; i++) {
            const duplicate = service.duplicateRecipe(currentId);
            chain.push(duplicate.id);
            currentId = duplicate.id;
          }

          // Get heritage of the last recipe in chain
          const lastRecipeId = chain[chain.length - 1]!;
          const heritage = service.getRecipeHeritage(lastRecipeId);

          // Heritage should include the recipe itself
          expect(heritage.recipe.id).toBe(lastRecipeId);

          // If not the original, should have a parent
          if (chainLength > 0) {
            expect(heritage.parent).toBeDefined();
            expect(heritage.parent!.id).toBe(chain[chain.length - 2]);
          }

          // Ancestors should trace back to original
          expect(heritage.ancestors.length).toBe(chainLength);
          
          // First ancestor should be the immediate parent
          if (chainLength > 0) {
            expect(heritage.ancestors[0]!.id).toBe(chain[chain.length - 2]);
          }

          // Last ancestor should be the original
          if (chainLength > 0) {
            expect(heritage.ancestors[chainLength - 1]!.id).toBe(original.id);
          }

          // Original should have no parent
          const originalHeritage = service.getRecipeHeritage(original.id);
          expect(originalHeritage.parent).toBeUndefined();
          expect(originalHeritage.ancestors.length).toBe(0);

          // Original should have children
          expect(originalHeritage.children.length).toBeGreaterThanOrEqual(1);
          expect(originalHeritage.children.some((c) => c.id === chain[1])).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track children of duplicated recipes', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 5 }),
        (recipeInput, numChildren) => {
          // Create original recipe
          const original = service.createRecipe(recipeInput);

          // Create multiple duplicates from the same parent
          const childIds: string[] = [];
          for (let i = 0; i < numChildren; i++) {
            const duplicate = service.duplicateRecipe(original.id);
            childIds.push(duplicate.id);
          }

          // Get heritage of original
          const heritage = service.getRecipeHeritage(original.id);

          // Should have all children
          expect(heritage.children.length).toBe(numChildren);

          // All child IDs should be in the children list
          for (const childId of childIds) {
            expect(heritage.children.some((c) => c.id === childId)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
