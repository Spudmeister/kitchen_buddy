/**
 * Property Test: Scaling Multiplies All Quantities
 *
 * **Feature: sous-chef, Property 4: Scaling Multiplies All Quantities**
 * **Validates: Requirements 2.1**
 *
 * For any recipe and any positive scale factor, scaling the recipe SHALL
 * multiply each ingredient quantity by exactly that factor.
 * Mathematically: scaled_quantity = original_quantity * factor for all ingredients.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { UnitConverter } from '../../src/services/unit-converter.js';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';
import type { Recipe } from '../../src/types/recipe.js';

/**
 * Generator for positive scale factors (reasonable cooking scales)
 */
const scaleFactorArb = fc.double({ min: 0.1, max: 10, noNaN: true });

describe('Property 4: Scaling Multiplies All Quantities', () => {
  const converter = new UnitConverter();
  let db: Database;
  let repo: RecipeRepository;

  beforeEach(async () => {
    db = await createDatabase();
    repo = new RecipeRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should multiply each ingredient quantity by exactly the scale factor', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, scaleFactorArb, (recipeInput, factor) => {
        // Create the recipe
        const recipe = repo.createRecipe(recipeInput);

        // Scale the recipe
        const scaledRecipe = converter.scaleRecipe(recipe, factor);

        // Verify each ingredient quantity is multiplied by the factor
        expect(scaledRecipe.ingredients.length).toBe(recipe.ingredients.length);

        for (let i = 0; i < recipe.ingredients.length; i++) {
          const original = recipe.ingredients[i]!;
          const scaled = scaledRecipe.ingredients[i]!;

          // Quantity should be exactly original * factor
          const expectedQuantity = original.quantity * factor;
          expect(scaled.quantity).toBeCloseTo(expectedQuantity, 10);

          // Unit should remain unchanged
          expect(scaled.unit).toBe(original.unit);

          // Name should remain unchanged
          expect(scaled.name).toBe(original.name);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should scale servings proportionally', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, scaleFactorArb, (recipeInput, factor) => {
        const recipe = repo.createRecipe(recipeInput);
        const scaledRecipe = converter.scaleRecipe(recipe, factor);

        // Servings should be scaled and rounded
        const expectedServings = Math.round(recipe.servings * factor);
        expect(scaledRecipe.servings).toBe(expectedServings);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all non-quantity fields when scaling', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, scaleFactorArb, (recipeInput, factor) => {
        const recipe = repo.createRecipe(recipeInput);
        const scaledRecipe = converter.scaleRecipe(recipe, factor);

        // Recipe metadata should be preserved
        expect(scaledRecipe.id).toBe(recipe.id);
        expect(scaledRecipe.title).toBe(recipe.title);
        expect(scaledRecipe.description).toBe(recipe.description);
        expect(scaledRecipe.prepTime).toEqual(recipe.prepTime);
        expect(scaledRecipe.cookTime).toEqual(recipe.cookTime);

        // Instructions should be preserved
        expect(scaledRecipe.instructions).toEqual(recipe.instructions);

        // Ingredient non-quantity fields should be preserved
        for (let i = 0; i < recipe.ingredients.length; i++) {
          const original = recipe.ingredients[i]!;
          const scaled = scaledRecipe.ingredients[i]!;

          expect(scaled.id).toBe(original.id);
          expect(scaled.name).toBe(original.name);
          expect(scaled.unit).toBe(original.unit);
          expect(scaled.notes).toBe(original.notes);
          expect(scaled.category).toBe(original.category);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should be reversible: scaling by factor then by 1/factor returns original quantities', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.double({ min: 0.5, max: 5, noNaN: true }),
        (recipeInput, factor) => {
          const recipe = repo.createRecipe(recipeInput);

          // Scale up
          const scaledUp = converter.scaleRecipe(recipe, factor);

          // Scale back down
          const scaledBack = converter.scaleRecipe(scaledUp, 1 / factor);

          // Quantities should be back to original (within floating point tolerance)
          for (let i = 0; i < recipe.ingredients.length; i++) {
            const original = recipe.ingredients[i]!;
            const roundTrip = scaledBack.ingredients[i]!;

            expect(roundTrip.quantity).toBeCloseTo(original.quantity, 8);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
