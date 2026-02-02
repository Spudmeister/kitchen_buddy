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
export type Unit =
  | USVolumeUnit
  | MetricVolumeUnit
  | USWeightUnit
  | MetricWeightUnit
  | CountUnit
  | OtherUnit;

/**
 * Duration in minutes
 */
export interface Duration {
  minutes: number;
}

/**
 * Create a duration from minutes
 */
export function durationFromMinutes(minutes: number): Duration {
  return { minutes };
}

/**
 * Create a duration from hours and minutes
 */
export function durationFromHoursMinutes(hours: number, minutes: number): Duration {
  return { minutes: hours * 60 + minutes };
}

/**
 * Format a duration for display
 */
export function formatDuration(duration: Duration): string {
  const hours = Math.floor(duration.minutes / 60);
  const mins = duration.minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Parse an ISO 8601 duration string (e.g., "PT15M", "PT1H30M")
 */
export function parseDuration(iso8601: string): Duration | null {
  const match = iso8601.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);

  return durationFromHoursMinutes(hours, minutes);
}

/**
 * Convert a duration to ISO 8601 format
 */
export function durationToISO8601(duration: Duration): string {
  const hours = Math.floor(duration.minutes / 60);
  const mins = duration.minutes % 60;

  if (hours === 0) {
    return `PT${mins}M`;
  }
  if (mins === 0) {
    return `PT${hours}H`;
  }
  return `PT${hours}H${mins}M`;
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: Unit): boolean {
  const volumeUnits: Unit[] = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', 'ml', 'l'];
  return volumeUnits.includes(unit);
}

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: Unit): boolean {
  const weightUnits: Unit[] = ['oz', 'lb', 'g', 'kg'];
  return weightUnits.includes(unit);
}

/**
 * Check if a unit is a US unit
 */
export function isUSUnit(unit: Unit): boolean {
  const usUnits: Unit[] = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', 'oz', 'lb'];
  return usUnits.includes(unit);
}

/**
 * Check if a unit is a metric unit
 */
export function isMetricUnit(unit: Unit): boolean {
  const metricUnits: Unit[] = ['ml', 'l', 'g', 'kg'];
  return metricUnits.includes(unit);
}

/**
 * Get the unit system for a given unit
 */
export function getUnitSystem(unit: Unit): UnitSystem | null {
  if (isUSUnit(unit)) return 'us';
  if (isMetricUnit(unit)) return 'metric';
  return null;
}
