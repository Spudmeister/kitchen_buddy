/**
 * Unit and measurement types for Sous Chef
 */
/**
 * Unit system preference
 */
export type UnitSystem = 'us' | 'metric';
/**
 * Volume units (US)
 */
export type USVolumeUnit = 'tsp' | 'tbsp' | 'cup' | 'fl_oz' | 'pint' | 'quart' | 'gallon';
/**
 * Volume units (Metric)
 */
export type MetricVolumeUnit = 'ml' | 'l';
/**
 * Weight units (US)
 */
export type USWeightUnit = 'oz' | 'lb';
/**
 * Weight units (Metric)
 */
export type MetricWeightUnit = 'g' | 'kg';
/**
 * Count units
 */
export type CountUnit = 'piece' | 'dozen';
/**
 * Other/special units
 */
export type OtherUnit = 'pinch' | 'dash' | 'to_taste';
/**
 * All supported units
 */
export type Unit = USVolumeUnit | MetricVolumeUnit | USWeightUnit | MetricWeightUnit | CountUnit | OtherUnit;
/**
 * Duration in minutes
 */
export interface Duration {
    minutes: number;
}
/**
 * Create a duration from minutes
 */
export declare function durationFromMinutes(minutes: number): Duration;
/**
 * Create a duration from hours and minutes
 */
export declare function durationFromHoursMinutes(hours: number, minutes: number): Duration;
/**
 * Format a duration for display
 */
export declare function formatDuration(duration: Duration): string;
/**
 * Parse an ISO 8601 duration string (e.g., "PT15M", "PT1H30M")
 */
export declare function parseDuration(iso8601: string): Duration | null;
/**
 * Convert a duration to ISO 8601 format
 */
export declare function durationToISO8601(duration: Duration): string;
/**
 * Check if a unit is a volume unit
 */
export declare function isVolumeUnit(unit: Unit): boolean;
/**
 * Check if a unit is a weight unit
 */
export declare function isWeightUnit(unit: Unit): boolean;
/**
 * Check if a unit is a US unit
 */
export declare function isUSUnit(unit: Unit): boolean;
/**
 * Check if a unit is a metric unit
 */
export declare function isMetricUnit(unit: Unit): boolean;
/**
 * Get the unit system for a given unit
 */
export declare function getUnitSystem(unit: Unit): UnitSystem | null;
//# sourceMappingURL=units.d.ts.map