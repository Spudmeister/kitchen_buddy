/**
 * Property Test: Preference Persistence
 * 
 * **Feature: sous-chef, Property 20: Preference Persistence**
 * **Validates: Requirements 10.4**
 * 
 * For any user preference that is set, the preference SHALL persist across
 * application restarts and SHALL be retrievable with the same value.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { PreferencesService } from '../../src/services/preferences-service.js';
import { unitSystemArb } from '../generators/recipe-generators.js';
import type { UnitSystem } from '../../src/types/units.js';

/**
 * Generator for valid servings (positive integers)
 */
const validServingsArb = fc.integer({ min: 1, max: 100 });

/**
 * Generator for valid leftover duration days (non-negative integers)
 */
const validLeftoverDaysArb = fc.integer({ min: 0, max: 30 });

/**
 * Generator for complete preferences update
 */
const preferencesUpdateArb = fc.record({
  defaultUnitSystem: unitSystemArb,
  defaultServings: validServingsArb,
  defaultLeftoverDurationDays: validLeftoverDaysArb,
});

describe('Property 20: Preference Persistence', () => {
  let db: Database;
  let preferencesService: PreferencesService;

  beforeEach(async () => {
    db = await createDatabase();
    preferencesService = new PreferencesService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should persist and retrieve unit system preference', () => {
    fc.assert(
      fc.property(unitSystemArb, (unitSystem: UnitSystem) => {
        // Set the preference
        preferencesService.setDefaultUnitSystem(unitSystem);

        // Retrieve and verify
        const retrieved = preferencesService.getDefaultUnitSystem();
        expect(retrieved).toBe(unitSystem);

        // Also verify through getPreferences
        const allPrefs = preferencesService.getPreferences();
        expect(allPrefs.defaultUnitSystem).toBe(unitSystem);
      }),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve servings preference', () => {
    fc.assert(
      fc.property(validServingsArb, (servings) => {
        // Set the preference
        preferencesService.setDefaultServings(servings);

        // Retrieve and verify
        const retrieved = preferencesService.getDefaultServings();
        expect(retrieved).toBe(servings);

        // Also verify through getPreferences
        const allPrefs = preferencesService.getPreferences();
        expect(allPrefs.defaultServings).toBe(servings);
      }),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve leftover duration preference', () => {
    fc.assert(
      fc.property(validLeftoverDaysArb, (days) => {
        // Set the preference
        preferencesService.setDefaultLeftoverDurationDays(days);

        // Retrieve and verify
        const retrieved = preferencesService.getDefaultLeftoverDurationDays();
        expect(retrieved).toBe(days);

        // Also verify through getPreferences
        const allPrefs = preferencesService.getPreferences();
        expect(allPrefs.defaultLeftoverDurationDays).toBe(days);
      }),
      { numRuns: 100 }
    );
  });

  it('should persist all preferences together via updatePreferences', () => {
    fc.assert(
      fc.property(preferencesUpdateArb, (update) => {
        // Update all preferences at once
        const result = preferencesService.updatePreferences(update);

        // Verify the returned preferences match
        expect(result.defaultUnitSystem).toBe(update.defaultUnitSystem);
        expect(result.defaultServings).toBe(update.defaultServings);
        expect(result.defaultLeftoverDurationDays).toBe(update.defaultLeftoverDurationDays);

        // Verify through getPreferences
        const retrieved = preferencesService.getPreferences();
        expect(retrieved.defaultUnitSystem).toBe(update.defaultUnitSystem);
        expect(retrieved.defaultServings).toBe(update.defaultServings);
        expect(retrieved.defaultLeftoverDurationDays).toBe(update.defaultLeftoverDurationDays);
      }),
      { numRuns: 100 }
    );
  });

  it('should persist preferences across service instances (simulating restart)', () => {
    fc.assert(
      fc.property(preferencesUpdateArb, (update) => {
        // Set preferences with first service instance
        preferencesService.updatePreferences(update);

        // Create a new service instance (simulating app restart)
        const newPreferencesService = new PreferencesService(db);

        // Verify preferences are still there
        const retrieved = newPreferencesService.getPreferences();
        expect(retrieved.defaultUnitSystem).toBe(update.defaultUnitSystem);
        expect(retrieved.defaultServings).toBe(update.defaultServings);
        expect(retrieved.defaultLeftoverDurationDays).toBe(update.defaultLeftoverDurationDays);
      }),
      { numRuns: 50 }
    );
  });

  it('should handle sequential updates correctly', () => {
    fc.assert(
      fc.property(
        fc.array(preferencesUpdateArb, { minLength: 2, maxLength: 5 }),
        (updates) => {
          // Apply each update sequentially
          for (const update of updates) {
            preferencesService.updatePreferences(update);
          }

          // The final state should match the last update
          const lastUpdate = updates[updates.length - 1]!;
          const retrieved = preferencesService.getPreferences();
          expect(retrieved.defaultUnitSystem).toBe(lastUpdate.defaultUnitSystem);
          expect(retrieved.defaultServings).toBe(lastUpdate.defaultServings);
          expect(retrieved.defaultLeftoverDurationDays).toBe(lastUpdate.defaultLeftoverDurationDays);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject invalid servings values', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 0 }),
        (invalidServings) => {
          expect(() => {
            preferencesService.setDefaultServings(invalidServings);
          }).toThrow('Default servings must be a positive number');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject negative leftover duration values', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: -1 }),
        (invalidDays) => {
          expect(() => {
            preferencesService.setDefaultLeftoverDurationDays(invalidDays);
          }).toThrow('Default leftover duration must be non-negative');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return defaults when no preferences are set', () => {
    // Get preferences without setting any
    const prefs = preferencesService.getPreferences();

    // Should return default values
    expect(prefs.defaultUnitSystem).toBe('us');
    expect(prefs.defaultServings).toBe(4);
    expect(prefs.defaultLeftoverDurationDays).toBe(3);
  });

  it('should reset to defaults correctly', () => {
    fc.assert(
      fc.property(preferencesUpdateArb, (update) => {
        // Set some preferences
        preferencesService.updatePreferences(update);

        // Reset to defaults
        const resetPrefs = preferencesService.resetToDefaults();

        // Should be back to defaults
        expect(resetPrefs.defaultUnitSystem).toBe('us');
        expect(resetPrefs.defaultServings).toBe(4);
        expect(resetPrefs.defaultLeftoverDurationDays).toBe(3);

        // Verify through getPreferences
        const retrieved = preferencesService.getPreferences();
        expect(retrieved.defaultUnitSystem).toBe('us');
        expect(retrieved.defaultServings).toBe(4);
        expect(retrieved.defaultLeftoverDurationDays).toBe(3);
      }),
      { numRuns: 30 }
    );
  });
});
