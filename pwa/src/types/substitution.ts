/**
 * Substitution types for Sous Chef PWA
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { Unit } from './units';

/**
 * Category of substitution
 */
export type SubstitutionCategory =
  | 'dairy'
  | 'egg'
  | 'flour'
  | 'sweetener'
  | 'fat'
  | 'protein'
  | 'liquid'
  | 'leavening'
  | 'spice'
  | 'other';

/**
 * A substitution suggestion for an ingredient
 */
export interface Substitution {
  /** Original ingredient name */
  original: string;
  /** Substitute ingredient name */
  substitute: string;
  /** Conversion ratio (multiply original quantity by this) */
  ratio: number;
  /** Unit for the substitute (may differ from original) */
  unit?: Unit;
  /** Notes about expected differences */
  notes?: string;
  /** Category of substitution */
  category: SubstitutionCategory;
}
