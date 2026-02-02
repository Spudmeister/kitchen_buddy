/**
 * Property Test: Unit Conversion Round-Trip
 *
 * **Feature: sous-chef, Property 5: Unit Conversion Round-Trip**
 * **Validates: Requirements 2.2**
 *
 * For any ingredient with a convertible unit, converting from US to metric
 * and back to US (or vice versa) SHALL produce a value within 1% of the
 * original quantity.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UnitConverter } from '../../src/services/unit-converter.js';
import type { Unit, UnitSystem } from '../../src/types/units.js';
import type { Ingredient } from '../../src/types/recipe.js';
import { isUSUnit, isMetricUnit, isVolumeUnit, isWeightUnit } from '../../src/types/units.js';

/**
 * US volume units that can be converted
 */
const US_VOLUME_UNITS: Unit[] = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon'];

/**
 * Metric volume units that can be converted
 */
const METRIC_VOLUME_UNITS: Unit[] = ['ml', 'l'];

/**
 * US weight units that can be converted
 */
const US_WEIGHT_UNITS: Unit[] = ['oz', 'lb'];

/**
 * Metric weight units that can be converted
 */
const METRIC_WEIGHT_UNITS: Unit[] = ['g', 'kg'];

/**
 * All convertible units
 */
const CONVERTIBLE_UNITS: Unit[] = [
  ...US_VOLUME_UNITS,
  ...METRIC_VOLUME_UNITS,
  ...US_WEIGHT_UNITS,
  ...METRIC_WEIGHT_UNITS,
];

/**
 * Generator for convertible units
 */
const convertibleUnitArb = fc.constantFrom(...CONVERTIBLE_UNITS);

/**
 * Generator for US units
 */
const usUnitArb = fc.constantFrom(...US_VOLUME_UNITS, ...US_WEIGHT_UNITS);

/**
 * Generator for metric units
 */
const metricUnitArb = fc.constantFrom(...METRIC_VOLUME_UNITS, ...METRIC_WEIGHT_UNITS);

/**
 * Generator for quantities (reasonable cooking amounts)
 */
const quantityArb = fc.double({ min: 0.01, max: 1000, noNaN: true });

/**
 * Create a test ingredient
 */
function createIngredient(quantity: number, unit: Unit): Ingredient {
  return {
    id: 'test-id',
    name: 'Test Ingredient',
    quantity,
    unit,
  };
}

describe('Property 5: Unit Conversion Round-Trip', () => {
  const converter = new UnitConverter();

  it('should produce values within 1% when converting US to metric and back to original unit', () => {
    fc.assert(
      fc.property(quantityArb, usUnitArb, (quantity, unit) => {
        const ingredient = createIngredient(quantity, unit);

        // Convert to metric
        const metricIngredient = converter.convertToSystem(ingredient, 'metric');

        // Convert back to the ORIGINAL unit (not just any US unit)
        const roundTripQuantity = converter.convert(
          metricIngredient.quantity,
          metricIngredient.unit,
          unit
        );

        // Should be convertible
        expect(roundTripQuantity).not.toBeNull();

        // The round-trip should produce a value within 1% of original
        const percentDiff = Math.abs(roundTripQuantity! - quantity) / quantity;

        expect(percentDiff).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce values within 1% when converting metric to US and back to original unit', () => {
    fc.assert(
      fc.property(quantityArb, metricUnitArb, (quantity, unit) => {
        const ingredient = createIngredient(quantity, unit);

        // Convert to US
        const usIngredient = converter.convertToSystem(ingredient, 'us');

        // Convert back to the ORIGINAL unit (not just any metric unit)
        const roundTripQuantity = converter.convert(
          usIngredient.quantity,
          usIngredient.unit,
          unit
        );

        // Should be convertible
        expect(roundTripQuantity).not.toBeNull();

        // The round-trip should produce a value within 1% of original
        const percentDiff = Math.abs(roundTripQuantity! - quantity) / quantity;

        expect(percentDiff).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve exact values when converting between same-system units', () => {
    fc.assert(
      fc.property(quantityArb, convertibleUnitArb, (quantity, unit) => {
        const ingredient = createIngredient(quantity, unit);
        const system = isUSUnit(unit) ? 'us' : 'metric';

        // Convert to same system (should be no-op or same-system conversion)
        const converted = converter.convertToSystem(ingredient, system as UnitSystem);

        // Should be able to convert back to original unit exactly
        const backConverted = converter.convert(
          converted.quantity,
          converted.unit,
          unit
        );

        // Should be very close (floating point tolerance)
        if (backConverted !== null) {
          expect(backConverted).toBeCloseTo(quantity, 10);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain unit category through round-trip (volume stays volume, weight stays weight)', () => {
    fc.assert(
      fc.property(quantityArb, convertibleUnitArb, (quantity, unit) => {
        const ingredient = createIngredient(quantity, unit);
        const originalIsVolume = isVolumeUnit(unit);
        const originalIsWeight = isWeightUnit(unit);

        // Convert to opposite system
        const targetSystem: UnitSystem = isUSUnit(unit) ? 'metric' : 'us';
        const converted = converter.convertToSystem(ingredient, targetSystem);

        // Category should be preserved
        if (originalIsVolume) {
          expect(isVolumeUnit(converted.unit)).toBe(true);
        }
        if (originalIsWeight) {
          expect(isWeightUnit(converted.unit)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
