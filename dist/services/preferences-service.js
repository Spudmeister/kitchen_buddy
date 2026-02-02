/**
 * Preferences Service - Business logic for user preferences
 *
 * Provides get/set operations for user preferences with persistence.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
import { DEFAULT_PREFERENCES } from '../types/preferences.js';
/**
 * Service for managing user preferences
 */
export class PreferencesService {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get all user preferences
     * Requirements: 10.4 - Persist user preferences across sessions
     */
    getPreferences() {
        const preferences = { ...DEFAULT_PREFERENCES };
        // Load each preference from database
        const unitSystem = this.getPreference('defaultUnitSystem');
        if (unitSystem === 'us' || unitSystem === 'metric') {
            preferences.defaultUnitSystem = unitSystem;
        }
        const servings = this.getPreference('defaultServings');
        if (servings !== null) {
            const parsed = parseInt(servings, 10);
            if (!isNaN(parsed) && parsed > 0) {
                preferences.defaultServings = parsed;
            }
        }
        const leftoverDays = this.getPreference('defaultLeftoverDurationDays');
        if (leftoverDays !== null) {
            const parsed = parseInt(leftoverDays, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                preferences.defaultLeftoverDurationDays = parsed;
            }
        }
        return preferences;
    }
    /**
     * Update user preferences
     * Requirements: 10.1 - Set default unit system
     * Requirements: 10.2 - Set default serving sizes
     * Requirements: 10.3 - Configure leftover duration defaults
     */
    updatePreferences(updates) {
        if (updates.defaultUnitSystem !== undefined) {
            this.setPreference('defaultUnitSystem', updates.defaultUnitSystem);
        }
        if (updates.defaultServings !== undefined) {
            if (updates.defaultServings <= 0) {
                throw new Error('Default servings must be a positive number');
            }
            this.setPreference('defaultServings', String(updates.defaultServings));
        }
        if (updates.defaultLeftoverDurationDays !== undefined) {
            if (updates.defaultLeftoverDurationDays < 0) {
                throw new Error('Default leftover duration must be non-negative');
            }
            this.setPreference('defaultLeftoverDurationDays', String(updates.defaultLeftoverDurationDays));
        }
        return this.getPreferences();
    }
    /**
     * Get the default unit system preference
     * Requirements: 10.1 - Apply default unit system to all recipe displays
     */
    getDefaultUnitSystem() {
        const value = this.getPreference('defaultUnitSystem');
        if (value === 'us' || value === 'metric') {
            return value;
        }
        return DEFAULT_PREFERENCES.defaultUnitSystem;
    }
    /**
     * Set the default unit system preference
     * Requirements: 10.1 - Set default unit system
     */
    setDefaultUnitSystem(unitSystem) {
        this.setPreference('defaultUnitSystem', unitSystem);
    }
    /**
     * Get the default servings preference
     * Requirements: 10.2 - Use default serving sizes when displaying recipes
     */
    getDefaultServings() {
        const value = this.getPreference('defaultServings');
        if (value !== null) {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        return DEFAULT_PREFERENCES.defaultServings;
    }
    /**
     * Set the default servings preference
     * Requirements: 10.2 - Set default serving sizes
     */
    setDefaultServings(servings) {
        if (servings <= 0) {
            throw new Error('Default servings must be a positive number');
        }
        this.setPreference('defaultServings', String(servings));
    }
    /**
     * Get the default leftover duration preference
     * Requirements: 10.3 - Use default leftover duration for new recipes
     */
    getDefaultLeftoverDurationDays() {
        const value = this.getPreference('defaultLeftoverDurationDays');
        if (value !== null) {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                return parsed;
            }
        }
        return DEFAULT_PREFERENCES.defaultLeftoverDurationDays;
    }
    /**
     * Set the default leftover duration preference
     * Requirements: 10.3 - Configure leftover duration defaults
     */
    setDefaultLeftoverDurationDays(days) {
        if (days < 0) {
            throw new Error('Default leftover duration must be non-negative');
        }
        this.setPreference('defaultLeftoverDurationDays', String(days));
    }
    /**
     * Reset all preferences to defaults
     */
    resetToDefaults() {
        this.db.run('DELETE FROM preferences');
        return this.getPreferences();
    }
    // Private helper methods
    getPreference(key) {
        const row = this.db.get('SELECT value FROM preferences WHERE key = ?', [key]);
        return row?.[0] ?? null;
    }
    setPreference(key, value) {
        this.db.run('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value]);
    }
}
//# sourceMappingURL=preferences-service.js.map