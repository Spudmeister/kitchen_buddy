/**
 * User preferences types for Sous Chef
 */
import type { UnitSystem } from './units.js';
/**
 * All user preference keys
 */
export type PreferenceKey = 'defaultUnitSystem' | 'defaultServings' | 'defaultLeftoverDurationDays';
/**
 * User preferences structure
 */
export interface UserPreferences {
    /** Default unit system for displaying recipes (us or metric) */
    defaultUnitSystem: UnitSystem;
    /** Default serving size when displaying recipes */
    defaultServings: number;
    /** Default leftover duration in days for new recipes */
    defaultLeftoverDurationDays: number;
}
/**
 * Default values for user preferences
 */
export declare const DEFAULT_PREFERENCES: UserPreferences;
/**
 * Input for updating preferences (all fields optional)
 */
export type PreferencesUpdate = Partial<UserPreferences>;
//# sourceMappingURL=preferences.d.ts.map