/**
 * Export/Import types for Sous Chef
 * Requirements: 8.2, 8.3, 9.3, 9.8, 9.9 - JSON export/import format
 */

import type { IngredientCategory } from './recipe.js';
import type { PhotoMetadata, SupportedImageFormat } from './photo.js';
import type { IngredientModification } from './instance.js';
import type { Unit, UnitSystem } from './units.js';

/**
 * Current export format version
 */
export const EXPORT_FORMAT_VERSION = '1.0';

/**
 * Exported ingredient (simplified for JSON)
 */
export interface ExportedIngredient {
  name: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  category?: IngredientCategory;
}

/**
 * Exported instruction (simplified for JSON)
 */
export interface ExportedInstruction {
  step: number;
  text: string;
  durationMinutes?: number;
  notes?: string;
}

/**
 * Exported recipe (JSON format)
 * Requirements: 9.3 - Documented JSON format for import/export
 */
export interface ExportedRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: ExportedIngredient[];
  instructions: ExportedInstruction[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  tags: string[];
  rating?: number;
  sourceUrl?: string;
  parentRecipeId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Exported photo (JSON format)
 */
export interface ExportedPhoto {
  id: string;
  recipeId: string;
  instanceId?: string;
  filename: string;
  mimeType: SupportedImageFormat;
  width?: number;
  height?: number;
  takenAt?: string;
  metadata: PhotoMetadata;
  createdAt: string;
  /** Base64 encoded photo data (only included if includePhotos is true) */
  data?: string;
}

/**
 * Exported cook session (JSON format)
 */
export interface ExportedCookSession {
  id: string;
  recipeId: string;
  date: string;
  actualPrepMinutes?: number;
  actualCookMinutes?: number;
  servingsMade: number;
  notes?: string;
  instanceId?: string;
}

/**
 * Exported rating entry (JSON format)
 */
export interface ExportedRating {
  id: string;
  recipeId: string;
  rating: number;
  ratedAt: string;
}

/**
 * Exported recipe instance (JSON format)
 */
export interface ExportedInstance {
  id: string;
  recipeId: string;
  recipeVersion: number;
  cookSessionId?: string;
  scaleFactor: number;
  unitSystem: UnitSystem;
  servings: number;
  notes?: string;
  modifications: IngredientModification[];
  createdAt: string;
}

/**
 * Recipe export data structure
 * Requirements: 8.2 - Generate portable data file in app's format
 */
export interface RecipeExport {
  /** Schema version for compatibility */
  version: string;
  /** When the export was created */
  exportedAt: string;
  /** Exported recipes */
  recipes: ExportedRecipe[];
  /** Optional photos (if includePhotos was true) */
  photos?: ExportedPhoto[];
  /** Optional cook sessions */
  cookSessions?: ExportedCookSession[];
  /** Optional ratings */
  ratings?: ExportedRating[];
  /** Optional recipe instances */
  instances?: ExportedInstance[];
}

/**
 * Exported folder (JSON format)
 */
export interface ExportedFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

/**
 * Folder export data structure
 * Requirements: 9.8 - Export all recipes in a folder as JSON
 */
export interface FolderExport extends RecipeExport {
  /** The folder being exported */
  folder: ExportedFolder;
}

/**
 * Full database export
 */
export interface FullExport extends RecipeExport {
  /** All folders */
  folders?: ExportedFolder[];
}

/**
 * Options for exporting recipes
 */
export interface ExportOptions {
  /** Include photo data (base64 encoded) */
  includePhotos?: boolean;
  /** Include cook session history */
  includeCookSessions?: boolean;
  /** Include rating history */
  includeRatings?: boolean;
  /** Include recipe instances */
  includeInstances?: boolean;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Number of recipes imported */
  recipesImported: number;
  /** Number of recipes skipped (already exist) */
  recipesSkipped: number;
  /** Number of photos imported */
  photosImported: number;
  /** Number of cook sessions imported */
  cookSessionsImported: number;
  /** Number of ratings imported */
  ratingsImported: number;
  /** Number of instances imported */
  instancesImported: number;
  /** Any errors encountered */
  errors: string[];
  /** IDs of imported recipes */
  importedRecipeIds: string[];
}

/**
 * Validation error for import
 */
export interface ImportValidationError {
  field: string;
  message: string;
  recipeIndex?: number;
}
