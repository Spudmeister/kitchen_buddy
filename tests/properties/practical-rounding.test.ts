/**
 * Property Test: Practical Rounding Produces Valid Measurements
 *
 * **Feature: sous-chef, Property 7: Practical Rounding Produces Valid Measurements**
 * **Validates: Requirements 2.4**
 *
 * For any scaled quantity, the rounded result SHALL be a practical cooking
 * measurement (e.g., 1/4, 1/3, 1/2, 2/3, 3/4, or whole numbers for common units).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UnitConverter } from '../../src/services/unit-converter.js';
import type { Unit } from '../../src/types/units.js';

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
  // Allow small tolerance for floating point comparison
  const tolerance = 0.01;
  for (const fraction of PRACTICAL_FRACTIONS) {
    if (Math.abs(fractionalPart - fraction) < tolerance) {
      return true;
    }
  }
  return false;
}

/**
 * Volume and weight units that should use practical fractions
 */
const STANDARD_UNITS: Unit[] = [
  'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon',
  'ml', 'l',
  'oz', 'lb',
  'g', 'kg',
];

/**
 * Count units
 */
const COUNT_UNITS: Unit[] = ['piece', 'dozen'];

/**
 * Special units
 */
const SPECIAL_UNITS: Unit[] = ['pinch', 'dash', 'to_taste'];

/**
 * Generator for standard units
 */
const standardUnitArb = fc.constantFrom(...STANDARD_UNITS);

/**
 * Generator for count units
 */
const countUnitArb = fc.constantFrom(...COUNT_UNITS);

/**
 * Generator for special units
 */
const specialUnitArb = fc.constantFrom(...SPECIAL_UNITS);

/**
 * Generator for quantities (reasonable cooking amounts)
 */
const quantityArb = fc.double({ min: 0.01, max: 100, noNaN: true });

describe('Property 7: Practical Rounding Produces Valid Measurements', () => {
  const converter = new UnitConverter();

  it('should round standard units to practical fractions', () => {
    fc.assert(
      fc.property(quantityArb, standardUnitArb, (quantity, unit) => {
        const rounded = converter.roundToPractical(quantity, unit);

        // Result should be positive
        expect(rounded).toBeGreaterThanOrEqual(0);

        // For quantities >= 0.125, the fractional part should be a practical fraction
        if (quantity >= 0.125) {
          const fractionalPart = rounded - Math.floor(rounded);
          expect(isPracticalFraction(fractionalPart)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should round count units to whole or half values for reasonable quantities', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.125, max: 100, noNaN: true }),
        countUnitArb,
        (quantity, unit) => {
          const rounded = converter.roundToPractical(quantity, unit);

          // Result should be positive
          expect(rounded).toBeGreaterThanOrEqual(0);

          // Should be a multiple of 0.5 (whole or half)
          const remainder = rounded % 0.5;
          expect(remainder).toBeCloseTo(0, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should round special units to whole numbers for reasonable quantities', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.125, max: 100, noNaN: true }),
        specialUnitArb,
        (quantity, unit) => {
          const rounded = converter.roundToPractical(quantity, unit);

          // Result should be positive
          expect(rounded).toBeGreaterThanOrEqual(0);

          // Should be a whole number
          expect(rounded).toBe(Math.round(rounded));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not change the value by more than half a practical fraction', () => {
    fc.assert(
      fc.property(quantityArb, standardUnitArb, (quantity, unit) => {
        const rounded = converter.roundToPractical(quantity, unit);

        // The difference should be reasonable (not more than ~0.17 for 1/3 rounding)
        const diff = Math.abs(rounded - quantity);

        // Maximum expected difference is about 0.17 (half of 1/3)
        // But for very small quantities, we allow more relative difference
        if (quantity >= 0.125) {
          expect(diff).toBeLessThanOrEqual(0.2);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve very small quantities with precision', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 0.124, noNaN: true }),
        standardUnitArb,
        (quantity, unit) => {
          const rounded = converter.roundToPractical(quantity, unit);

          // For very small quantities, should keep 2 decimal precision
          const roundedTo2Decimals = Math.round(quantity * 100) / 100;
          expect(rounded).toBeCloseTo(roundedTo2Decimals, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce consistent results (idempotent)', () => {
    fc.assert(
      fc.property(quantityArb, standardUnitArb, (quantity, unit) => {
        const rounded1 = converter.roundToPractical(quantity, unit);
        const rounded2 = converter.roundToPractical(rounded1, unit);

        // Rounding an already-rounded value should give the same result
        expect(rounded2).toBeCloseTo(rounded1, 10);
      }),
      { numRuns: 100 }
    );
  });
});
