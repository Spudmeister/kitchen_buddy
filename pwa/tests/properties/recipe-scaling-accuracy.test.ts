/**
 * Property Test: Recipe Scaling Accuracy
 *
 * **Feature: sous-chef-pwa, Property 1: Recipe Scaling Accuracy**
 * **Validates: Requirements 5.2, 5.4**
 *
 * For any recipe and any positive scale factor, scaling the recipe SHALL multiply
 * each ingredient quantity by exactly that factor, and the displayed quantities
 * SHALL be rounded to practical cooking measurements (standard fractions like
 * 1/4, 1/3, 1/2, 2/3, 3/4, or whole numbers).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  scaleIngredient,
  scaleIngredients,
  roundToPractical,
} from '../../src/services/scaling-service';
import type { Ingredient } from '../../src/types/recipe';
import type { Unit } from '../../src/types/units';

/**
 * Practical fractions that are valid for cooking measurements
 */
const PRACTICAL_FRACTIONS = new Set([
  0,      // whole number
  0.125,  // 1/8
  0.25,   // 1/4
  0.333,  // 1/3
  0.5,    // 1/2
  0.667,  // 2/3
  0.75,   // 3/4
]);

/**
 * Check if a fractional part is a practical cooking fraction
 */
function isPracticalFraction(fractionalPart: number): boolean {
  const tolerance = 0.01;
  for (const fraction of PRACTICAL_FRACTIONS) {
    if (Math.abs(fractionalPart - fraction) < tolerance) {
      return true;
    }
  }
  return false;
}

/**
 * Standard units that should use practical fractions
 */
const STANDARD_UNITS: Unit[] = [
  'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon',
  'ml', 'l', 'oz', 'lb', 'g', 'kg',
];

/**
 * Generator for standard units
 */
const standardUnitArb = fc.constantFrom(...STANDARD_UNITS);

/**
 * Generator for positive quantities (reasonable cooking amounts)
 */
const quantityArb = fc.double({ min: 0.1, max: 100, noNaN: true });

/**
 * Generator for positive scale factors
 */
const scaleFactorArb = fc.double({ min: 0.25, max: 10, noNaN: true });

/**
 * Generator for ingredient
 */
const ingredientArb = (unit: Unit): fc.Arbitrary<Ingredient> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    quantity: quantityArb,
    unit: fc.constant(unit),
    notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    category: fc.constant(undefined),
  });

describe('Property 1: Recipe Scaling Accuracy', () => {
  it('should multiply ingredient quantities by the scale factor', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => 
          fc.tuple(ingredientArb(unit), scaleFactorArb)
        ),
        ([ingredient, factor]) => {
          const scaled = scaleIngredient(ingredient, factor);
          
          // The scaled quantity should be approximately factor * original
          // (allowing for practical rounding)
          const expectedRaw = ingredient.quantity * factor;
          const expectedRounded = roundToPractical(expectedRaw, ingredient.unit);
          
          expect(scaled.quantity).toBeCloseTo(expectedRounded, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce practical cooking measurements after scaling', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => 
          fc.tuple(ingredientArb(unit), scaleFactorArb)
        ),
        ([ingredient, factor]) => {
          const scaled = scaleIngredient(ingredient, factor);
          
          // For quantities >= 0.125, the fractional part should be practical
          if (scaled.quantity >= 0.125) {
            const fractionalPart = scaled.quantity - Math.floor(scaled.quantity);
            expect(isPracticalFraction(fractionalPart)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scale all ingredients in a list consistently', () => {
    fc.assert(
      fc.property(
        fc.array(
          standardUnitArb.chain(unit => ingredientArb(unit)),
          { minLength: 1, maxLength: 20 }
        ),
        scaleFactorArb,
        (ingredients, factor) => {
          const scaled = scaleIngredients(ingredients, factor);
          
          // Same number of ingredients
          expect(scaled.length).toBe(ingredients.length);
          
          // Each ingredient should be scaled
          for (let i = 0; i < ingredients.length; i++) {
            const original = ingredients[i];
            const scaledIng = scaled[i];
            
            // ID and name should be preserved
            expect(scaledIng.id).toBe(original.id);
            expect(scaledIng.name).toBe(original.name);
            expect(scaledIng.unit).toBe(original.unit);
            
            // Quantity should be scaled and rounded
            const expectedRaw = original.quantity * factor;
            const expectedRounded = roundToPractical(expectedRaw, original.unit);
            expect(scaledIng.quantity).toBeCloseTo(expectedRounded, 10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve ingredient identity (scaling factor of 1)', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => ingredientArb(unit)),
        (ingredient) => {
          const scaled = scaleIngredient(ingredient, 1);
          
          // With factor 1, quantity should be rounded but close to original
          const expectedRounded = roundToPractical(ingredient.quantity, ingredient.unit);
          expect(scaled.quantity).toBeCloseTo(expectedRounded, 10);
          expect(scaled.id).toBe(ingredient.id);
          expect(scaled.name).toBe(ingredient.name);
          expect(scaled.unit).toBe(ingredient.unit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle doubling (2x) correctly', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => ingredientArb(unit)),
        (ingredient) => {
          const doubled = scaleIngredient(ingredient, 2);
          
          // Doubled quantity should be approximately 2x original (with rounding)
          const expectedRaw = ingredient.quantity * 2;
          const expectedRounded = roundToPractical(expectedRaw, ingredient.unit);
          expect(doubled.quantity).toBeCloseTo(expectedRounded, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle halving (0.5x) correctly', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => ingredientArb(unit)),
        (ingredient) => {
          const halved = scaleIngredient(ingredient, 0.5);
          
          // Halved quantity should be approximately 0.5x original (with rounding)
          const expectedRaw = ingredient.quantity * 0.5;
          const expectedRounded = roundToPractical(expectedRaw, ingredient.unit);
          expect(halved.quantity).toBeCloseTo(expectedRounded, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not change the value by more than half a practical fraction', () => {
    fc.assert(
      fc.property(
        standardUnitArb.chain(unit => 
          fc.tuple(ingredientArb(unit), scaleFactorArb)
        ),
        ([ingredient, factor]) => {
          const scaled = scaleIngredient(ingredient, factor);
          const rawScaled = ingredient.quantity * factor;
          
          // The difference between raw and rounded should be reasonable
          const diff = Math.abs(scaled.quantity - rawScaled);
          
          // Maximum expected difference is about 0.17 (half of 1/3)
          // For very small quantities, allow more relative difference
          if (rawScaled >= 0.125) {
            expect(diff).toBeLessThanOrEqual(0.2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
