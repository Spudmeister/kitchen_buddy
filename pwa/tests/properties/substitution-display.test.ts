/**
 * Property Test: Substitution Display
 *
 * **Feature: sous-chef-pwa, Property 10: Substitution Display**
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 *
 * For any ingredient with known substitutions, a substitution indicator SHALL appear,
 * and tapping it SHALL display alternatives with conversion ratios and notes about
 * expected differences.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getSubstitutions,
  hasSubstitutions,
  getIngredientsWithSubstitutions,
} from '../../src/services/substitution-service';
import type { Substitution } from '../../src/types/substitution';

/**
 * Get all ingredient names that have substitutions in the database
 */
const ingredientsWithSubstitutions = getIngredientsWithSubstitutions();

/**
 * Arbitrary for generating an ingredient name that has substitutions
 */
const ingredientWithSubstitutionsArb = fc.constantFrom(...ingredientsWithSubstitutions);

/**
 * Arbitrary for generating an ingredient name that does NOT have substitutions
 */
const ingredientWithoutSubstitutionsArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .filter(s => !hasSubstitutions(s));

describe('Property 10: Substitution Display', () => {
  describe('Requirement 9.1: Substitution indicator appears for ingredients with alternatives', () => {
    it('should return true for hasSubstitutions when ingredient has known substitutions', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          // For any ingredient with known substitutions, hasSubstitutions should return true
          expect(hasSubstitutions(ingredientName)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should return false for hasSubstitutions when ingredient has no known substitutions', () => {
      fc.assert(
        fc.property(ingredientWithoutSubstitutionsArb, (ingredientName) => {
          // For any ingredient without known substitutions, hasSubstitutions should return false
          expect(hasSubstitutions(ingredientName)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.2: Display available alternatives', () => {
    it('should return non-empty array of substitutions for ingredients with alternatives', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          // Should have at least one substitution
          expect(substitutions.length).toBeGreaterThan(0);
          
          // Each substitution should have a substitute name
          for (const sub of substitutions) {
            expect(sub.substitute).toBeDefined();
            expect(sub.substitute.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should return empty array for ingredients without alternatives', () => {
      fc.assert(
        fc.property(ingredientWithoutSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          // Should have no substitutions
          expect(substitutions.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.3: Show conversion ratios', () => {
    it('should include a valid conversion ratio for each substitution', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          for (const sub of substitutions) {
            // Each substitution should have a ratio
            expect(sub.ratio).toBeDefined();
            expect(typeof sub.ratio).toBe('number');
            
            // Ratio should be positive
            expect(sub.ratio).toBeGreaterThan(0);
            
            // Ratio should be reasonable (not too extreme)
            expect(sub.ratio).toBeLessThanOrEqual(10);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have ratio that can be used to calculate substitute quantity', () => {
      fc.assert(
        fc.property(
          ingredientWithSubstitutionsArb,
          fc.double({ min: 0.1, max: 100, noNaN: true }),
          (ingredientName, originalQuantity) => {
            const substitutions = getSubstitutions(ingredientName);
            
            for (const sub of substitutions) {
              // Calculate substitute quantity
              const substituteQuantity = originalQuantity * sub.ratio;
              
              // Should produce a valid positive number
              expect(substituteQuantity).toBeGreaterThan(0);
              expect(Number.isFinite(substituteQuantity)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 9.4: Show notes about expected differences', () => {
    it('should include notes for substitutions that have them', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          // At least some substitutions should have notes
          const substitutionsWithNotes = substitutions.filter(sub => sub.notes);
          
          // Most substitutions in our database have notes
          // We expect at least one to have notes
          expect(substitutionsWithNotes.length).toBeGreaterThan(0);
          
          // Notes should be non-empty strings
          for (const sub of substitutionsWithNotes) {
            expect(typeof sub.notes).toBe('string');
            expect(sub.notes!.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have notes that describe expected differences', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          for (const sub of substitutions) {
            if (sub.notes) {
              // Notes should be descriptive (more than just a few characters)
              expect(sub.notes.length).toBeGreaterThan(5);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Substitution data integrity', () => {
    it('should have valid category for each substitution', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          const validCategories = [
            'dairy', 'egg', 'flour', 'sweetener', 'fat',
            'protein', 'liquid', 'leavening', 'spice', 'other'
          ];
          
          for (const sub of substitutions) {
            expect(sub.category).toBeDefined();
            expect(validCategories).toContain(sub.category);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should have original ingredient name in each substitution', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions = getSubstitutions(ingredientName);
          
          for (const sub of substitutions) {
            expect(sub.original).toBeDefined();
            expect(sub.original.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should return consistent results for the same ingredient', () => {
      fc.assert(
        fc.property(ingredientWithSubstitutionsArb, (ingredientName) => {
          const substitutions1 = getSubstitutions(ingredientName);
          const substitutions2 = getSubstitutions(ingredientName);
          
          // Should return the same number of substitutions
          expect(substitutions1.length).toBe(substitutions2.length);
          
          // Should return the same substitutes
          const substitutes1 = substitutions1.map(s => s.substitute).sort();
          const substitutes2 = substitutions2.map(s => s.substitute).sort();
          expect(substitutes1).toEqual(substitutes2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Case insensitivity and normalization', () => {
    it('should find substitutions regardless of case', () => {
      // Test with known ingredients in different cases
      const testCases = [
        { input: 'BUTTER', expected: true },
        { input: 'Butter', expected: true },
        { input: 'butter', expected: true },
        { input: 'MILK', expected: true },
        { input: 'Milk', expected: true },
        { input: 'milk', expected: true },
      ];

      for (const { input, expected } of testCases) {
        expect(hasSubstitutions(input)).toBe(expected);
      }
    });

    it('should handle ingredient names with extra whitespace', () => {
      // Test with known ingredients with extra whitespace
      const testCases = [
        { input: '  butter  ', expected: true },
        { input: 'butter ', expected: true },
        { input: ' milk', expected: true },
      ];

      for (const { input, expected } of testCases) {
        expect(hasSubstitutions(input)).toBe(expected);
      }
    });
  });
});
