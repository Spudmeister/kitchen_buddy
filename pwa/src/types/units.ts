/**
 * Unit and measurement types for Sous Chef PWA
 */

/**
 * Supported measurement units
 */
export type Unit =
  // Volume - US
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'fl_oz'
  | 'pint'
  | 'quart'
  | 'gallon'
  // Volume - Metric
  | 'ml'
  | 'l'
  // Weight - US
  | 'oz'
  | 'lb'
  // Weight - Metric
  | 'g'
  | 'kg'
  // Count
  | 'piece'
  | 'dozen'
  // Other
  | 'pinch'
  | 'dash'
  | 'to_taste';

/**
 * Unit system preference
 */
export type UnitSystem = 'us' | 'metric';

/**
 * Duration in minutes
 */
export interface Duration {
  minutes: number;
}
