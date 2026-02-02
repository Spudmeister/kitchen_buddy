/**
 * Visual Parser types for Sous Chef
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

import type { ParsedRecipe } from '../services/recipe-parser.js';

/**
 * Supported image formats for visual parsing
 * Requirements: 19.3 - Support JPEG, PNG, HEIC, HEIF, TIFF
 */
export type VisualParserImageFormat =
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'image/heif'
  | 'image/tiff';

/**
 * All supported visual parser image formats
 */
export const VISUAL_PARSER_SUPPORTED_FORMATS: VisualParserImageFormat[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/tiff',
];

/**
 * Options for visual parsing
 */
export interface VisualParseOptions {
  /** Language hint for handwritten text recognition */
  language?: string;
  /** Type hint for the recipe image */
  recipeType?: 'handwritten' | 'printed' | 'screenshot';
}

/**
 * Per-field confidence scores
 * Requirements: 19.4 - Per-field confidence scores
 */
export interface FieldConfidence {
  /** Confidence for title extraction (0-1) */
  title: number;
  /** Confidence for ingredients extraction (0-1) */
  ingredients: number;
  /** Confidence for instructions extraction (0-1) */
  instructions: number;
  /** Confidence for prep time extraction (0-1) */
  prepTime: number;
  /** Confidence for cook time extraction (0-1) */
  cookTime: number;
  /** Confidence for servings extraction (0-1) */
  servings: number;
}

/**
 * Result of visual parsing
 * Requirements: 19.4, 19.5 - Confidence reporting and low-confidence warnings
 */
export interface VisualParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed recipe data (if successful) */
  recipe?: ParsedRecipe;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Per-field confidence scores */
  fieldConfidence: FieldConfidence;
  /** Warnings for low-confidence fields */
  warnings?: string[];
  /** Raw extracted text (for debugging) */
  rawText?: string;
  /** Error messages (if unsuccessful) */
  errors?: string[];
}

/**
 * Default confidence threshold for warnings
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
