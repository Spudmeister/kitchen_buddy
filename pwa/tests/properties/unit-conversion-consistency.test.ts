/**
 * Property Test: Unit Conversion Consistency
 *
 * **Feature: sous-chef-pwa, Property 2: Unit Conversion Consistency**
 * **Validates: Requirements 5.3, 5.5**
 *
 * For any recipe displayed in a unit system, all ingredient measurements SHALL
 * be in that unit system. Conversions always derive from source values, never
 * from previously converted values.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  convertIngredientToSystem,
  convertIngredientsToSystem,
  getUnitSystem,
  isVolumeUnit,
  isWeightUnit,
} from '../../src/services/scaling-service';
import type { Ingredient } from '../../src/types/recipe';
import type { Unit, UnitSystem } from '../../src/types/units';

/**
 * US volume units
 */
const US_VOLUME_UNITS: Unit[] = ['tsp', 'tbsp', 'fl_oz', 'cup', 'pint', 'quart', 'gallon'];

/**
 * US weight units
 */
const US_WEIGHT_UNITS: Unit[] = ['oz', 'lb'];

/**
 * Metric volume units
 */
const METRIC_VOLUME_UNITS: Unit[] = ['ml', 'l'];

/**
 * Metric weight units
 */
const METRIC_WEIGHT_UNITS: Unit[] = ['g', 'kg'];

/**
 * All US units
 */
const US_UNITS: Unit[] = [...US_VOLUME_UNITS, ...US_WEIGHT_UNITS];

/**
 * All metric units
 */
const METRIC_UNITS: Unit[] = [...METRIC_VOLUME_UNITS, ...METRIC_WEIGHT_UNITS];

/**
 * Non-convertible units
 */
const NON_CONVERTIBLE_UNITS: Unit[] = ['piece', 'dozen', 'pinch', 'dash', 'to_taste'];

/**
 * All convertible units
 */
const ALL_CONVERTIBLE_UNITS: Unit[] = [...US_UNITS, ...METRIC_UNITS];

/**
 * Generator for US units
 */
const usUnitArb = fc.constantFrom(...US_UNITS);

/**
 * Generator for metric units
 */
const metricUnitArb = fc.constantFrom(...METRIC_UNITS);

/**
 * Generator for non-convertible units
 */
const nonConvertibleUnitArb = fc.constantFrom(...NON_CONVERTIBLE_UNITS);

/**
 * Generator for any convertible unit
 */
const convertibleUnitArb = fc.constantFrom(...ALL_CONVERTIBLE_UNITS);

/**
 * Generator for positive quantities (reasonable cooking amounts)
 */
const quantityArb = fc.double({ min: 0.5, max: 100, noNaN: true });

/**
 * Generator for ingredient with specific unit
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

describe('Property 2: Unit Conversion Consistency', () => {
  describe('Conversion produces correct unit system', () => {
    it('should convert US units to metric system', () => {
      fc.assert(
        fc.property(
          usUnitArb.chain(unit => ingredientArb(unit)),
          (ingredient) => {
            const converted = convertIngredientToSystem(ingredient, 'metric');
            
            // The converted unit should be in the metric system
            const convertedSystem = getUnitSystem(converted.unit);
            expect(convertedSystem).toBe('metric');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert metric units to US system', () => {
      fc.assert(
        fc.property(
          metricUnitArb.chain(unit => ingredientArb(unit)),
          (ingredient) => {
            const converted = convertIngredientToSystem(ingredient, 'us');
            
            // The converted unit should be in the US system
            const convertedSystem = getUnitSystem(converted.unit);
            expect(convertedSystem).toBe('us');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Conversion preserves measurement category', () => {
    it('should preserve volume/weight category during conversion', () => {
      fc.assert(
        fc.property(
          convertibleUnitArb.chain(unit => ingredientArb(unit)),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredient, targetSystem) => {
            const converted = convertIngredientToSystem(ingredient, targetSystem);
            
            // If original was volume, converted should be volume
            if (isVolumeUnit(ingredient.unit)) {
              expect(isVolumeUnit(converted.unit)).toBe(true);
            }
            
            // If original was weight, converted should be weight
            if (isWeightUnit(ingredient.unit)) {
              expect(isWeightUnit(converted.unit)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Conversion produces positive quantities', () => {
    it('should always produce positive quantities', () => {
      fc.assert(
        fc.property(
          convertibleUnitArb.chain(unit => ingredientArb(unit)),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredient, targetSystem) => {
            const converted = convertIngredientToSystem(ingredient, targetSystem);
            
            expect(converted.quantity).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Idempotent conversion (same system)', () => {
    it('should not change units when already in target system', () => {
      fc.assert(
        fc.property(
          usUnitArb.chain(unit => ingredientArb(unit)),
          (ingredient) => {
            const converted = convertIngredientToSystem(ingredient, 'us');
            
            // Should keep the same unit when already in target system
            expect(converted.unit).toBe(ingredient.unit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not change metric units when target is metric', () => {
      fc.assert(
        fc.property(
          metricUnitArb.chain(unit => ingredientArb(unit)),
          (ingredient) => {
            const converted = convertIngredientToSystem(ingredient, 'metric');
            
            // Should keep the same unit when already in target system
            expect(converted.unit).toBe(ingredient.unit);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Repeated conversion from source is consistent', () => {
    it('should produce identical results when converting same source multiple times', () => {
      fc.assert(
        fc.property(
          convertibleUnitArb.chain(unit => ingredientArb(unit)),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredient, targetSystem) => {
            // Convert the same source ingredient multiple times
            const converted1 = convertIngredientToSystem(ingredient, targetSystem);
            const converted2 = convertIngredientToSystem(ingredient, targetSystem);
            const converted3 = convertIngredientToSystem(ingredient, targetSystem);
            
            // All conversions from the same source should be identical
            expect(converted1.unit).toBe(converted2.unit);
            expect(converted1.unit).toBe(converted3.unit);
            expect(converted1.quantity).toBe(converted2.quantity);
            expect(converted1.quantity).toBe(converted3.quantity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Non-convertible units', () => {
    it('should preserve non-convertible units unchanged', () => {
      fc.assert(
        fc.property(
          nonConvertibleUnitArb.chain(unit => ingredientArb(unit)),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredient, targetSystem) => {
            const converted = convertIngredientToSystem(ingredient, targetSystem);
            
            // Non-convertible units should remain unchanged
            expect(converted.unit).toBe(ingredient.unit);
            expect(converted.quantity).toBe(ingredient.quantity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Batch conversion consistency', () => {
    it('should convert all ingredients in a list to the target system', () => {
      fc.assert(
        fc.property(
          fc.array(
            convertibleUnitArb.chain(unit => ingredientArb(unit)),
            { minLength: 1, maxLength: 20 }
          ),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredients, targetSystem) => {
            const converted = convertIngredientsToSystem(ingredients, targetSystem);
            
            // Same number of ingredients
            expect(converted.length).toBe(ingredients.length);
            
            // All convertible ingredients should be in target system
            for (let i = 0; i < converted.length; i++) {
              const original = ingredients[i];
              const conv = converted[i];
              
              // ID and name should be preserved
              expect(conv.id).toBe(original.id);
              expect(conv.name).toBe(original.name);
              
              // Should be in target system (or unchanged if non-convertible)
              const system = getUnitSystem(conv.unit);
              if (system !== null) {
                expect(system).toBe(targetSystem);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Identity preservation', () => {
    it('should preserve ingredient identity (id, name, notes) during conversion', () => {
      fc.assert(
        fc.property(
          convertibleUnitArb.chain(unit => ingredientArb(unit)),
          fc.constantFrom<UnitSystem>('us', 'metric'),
          (ingredient, targetSystem) => {
            const converted = convertIngredientToSystem(ingredient, targetSystem);
            
            expect(converted.id).toBe(ingredient.id);
            expect(converted.name).toBe(ingredient.name);
            expect(converted.notes).toBe(ingredient.notes);
            expect(converted.category).toBe(ingredient.category);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
