/**
 * Preferences Service - Business logic for user preferences
 *
 * Provides get/set operations for user preferences with persistence.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
import type { Database } from '../db/database.js';
import type { UserPreferences, PreferencesUpdate } from '../types/preferences.js';
import type { UnitSystem } from '../types/units.js';
/**
 * Service for managing user preferences
 */
export declare class PreferencesService {
    private db;
    constructor(db: Database);
    /**
     * Get all user preferences
     * Requirements: 10.4 - Persist user preferences across sessions
     */
    getPreferences(): UserPreferences;
    /**
     * Update user preferences
     * Requirements: 10.1 - Set default unit system
     * Requirements: 10.2 - Set default serving sizes
     * Requirements: 10.3 - Configure leftover duration defaults
     */
    updatePreferences(updates: PreferencesUpdate): UserPreferences;
    /**
     * Get the default unit system preference
     * Requirements: 10.1 - Apply default unit system to all recipe displays
     */
    getDefaultUnitSystem(): UnitSystem;
    /**
     * Set the default unit system preference
     * Requirements: 10.1 - Set default unit system
     */
    setDefaultUnitSystem(unitSystem: UnitSystem): void;
    /**
     * Get the default servings preference
     * Requirements: 10.2 - Use default serving sizes when displaying recipes
     */
    getDefaultServings(): number;
    /**
     * Set the default servings preference
     * Requirements: 10.2 - Set default serving sizes
     */
    setDefaultServings(servings: number): void;
    /**
     * Get the default leftover duration preference
     * Requirements: 10.3 - Use default leftover duration for new recipes
     */
    getDefaultLeftoverDurationDays(): number;
    /**
     * Set the default leftover duration preference
     * Requirements: 10.3 - Configure leftover duration defaults
     */
    setDefaultLeftoverDurationDays(days: number): void;
    /**
     * Reset all preferences to defaults
     */
    resetToDefaults(): UserPreferences;
    private getPreference;
    private setPreference;
}
//# sourceMappingURL=preferences-service.d.ts.map