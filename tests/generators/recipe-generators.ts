/**
 * Property-based test generators for recipes
 */

import * as fc from 'fast-check';
import type { RecipeInput, IngredientInput, InstructionInput, IngredientCategory } from '../../src/types/recipe.js';
import type { Unit } from '../../src/types/units.js';

/**
 * All valid units
 */
const ALL_UNITS: Unit[] = [
  'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon',
  'ml', 'l',
  'oz', 'lb',
  'g', 'kg',
  'piece', 'dozen',
  'pinch', 'dash', 'to_taste',
];

/**
 * All ingredient categories
 */
const ALL_CATEGORIES: IngredientCategory[] = [
  'produce', 'meat', 'seafood', 'dairy', 'bakery',
  'frozen', 'pantry', 'spices', 'beverages', 'other',
];

/**
 * Generator for valid unit
 */
export const unitArb = fc.constantFrom(...ALL_UNITS);

/**
 * Generator for ingredient category
 */
export const categoryArb = fc.constantFrom(...ALL_CATEGORIES);

/**
 * Generator for ingredient input
 */
export const ingredientInputArb: fc.Arbitrary<IngredientInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  quantity: fc.double({ min: 0.01, max: 1000, noNaN: true }),
  unit: unitArb,
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  category: fc.option(categoryArb, { nil: undefined }),
});

/**
 * Generator for instruction input
 */
export const instructionInputArb: fc.Arbitrary<InstructionInput> = fc.record({
  text: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
  durationMinutes: fc.option(fc.integer({ min: 1, max: 480 }), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

/**
 * Generator for tag name
 */
export const tagArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .map(s => s.toLowerCase().replace(/\s+/g, '-'));

/**
 * Generator for recipe input
 */
export const recipeInputArb: fc.Arbitrary<RecipeInput> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  ingredients: fc.array(ingredientInputArb, { minLength: 1, maxLength: 50 }),
  instructions: fc.array(instructionInputArb, { minLength: 1, maxLength: 30 }),
  prepTimeMinutes: fc.integer({ min: 0, max: 480 }),
  cookTimeMinutes: fc.integer({ min: 0, max: 480 }),
  servings: fc.integer({ min: 1, max: 100 }),
  tags: fc.option(fc.array(tagArb, { minLength: 0, maxLength: 10 }), { nil: undefined }),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
  folderId: fc.constant(undefined),
  parentRecipeId: fc.constant(undefined),
});

/**
 * Generator for a minimal valid recipe input (for faster tests)
 */
export const minimalRecipeInputArb: fc.Arbitrary<RecipeInput> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  ingredients: fc.array(ingredientInputArb, { minLength: 1, maxLength: 5 }),
  instructions: fc.array(instructionInputArb, { minLength: 1, maxLength: 5 }),
  prepTimeMinutes: fc.integer({ min: 0, max: 120 }),
  cookTimeMinutes: fc.integer({ min: 0, max: 120 }),
  servings: fc.integer({ min: 1, max: 12 }),
  tags: fc.option(fc.array(tagArb, { minLength: 0, maxLength: 3 }), { nil: undefined }),
  sourceUrl: fc.constant(undefined),
  folderId: fc.constant(undefined),
  parentRecipeId: fc.constant(undefined),
});


/**
 * Menu-related generators
 */

import type { MenuInput, MenuAssignmentInput, MealSlot } from '../../src/types/menu.js';

/**
 * All meal slots
 */
const ALL_MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Generator for meal slot
 */
export const mealSlotArb = fc.constantFrom(...ALL_MEAL_SLOTS);

/**
 * Generator for a date within a reasonable range (next year)
 */
export const dateArb = fc.date({
  min: new Date('2025-01-01'),
  max: new Date('2026-12-31'),
});

/**
 * Generator for a valid date range (start <= end)
 */
export const dateRangeArb = fc.tuple(dateArb, dateArb).map(([d1, d2]) => {
  const start = d1 <= d2 ? d1 : d2;
  const end = d1 <= d2 ? d2 : d1;
  return { startDate: start, endDate: end };
});

/**
 * Generator for menu input
 */
export const menuInputArb: fc.Arbitrary<MenuInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  startDate: dateArb,
  endDate: dateArb,
}).chain(({ name, startDate, endDate }) => {
  // Ensure startDate <= endDate
  const actualStart = startDate <= endDate ? startDate : endDate;
  const actualEnd = startDate <= endDate ? endDate : startDate;
  return fc.constant({
    name,
    startDate: actualStart,
    endDate: actualEnd,
  });
});

/**
 * Generator for leftover duration in days (reasonable cooking range)
 */
export const leftoverDurationArb = fc.integer({ min: 1, max: 14 });

/**
 * Generator for servings
 */
export const servingsArb = fc.integer({ min: 1, max: 20 });


/**
 * Statistics-related generators
 */

import type { CookSessionInput, RatingInput } from '../../src/types/statistics.js';

/**
 * Generator for cook session input
 */
export const cookSessionInputArb = (recipeId: string): fc.Arbitrary<CookSessionInput> => fc.record({
  recipeId: fc.constant(recipeId),
  date: dateArb,
  actualPrepMinutes: fc.option(fc.integer({ min: 1, max: 480 }), { nil: undefined }),
  actualCookMinutes: fc.option(fc.integer({ min: 1, max: 480 }), { nil: undefined }),
  servingsMade: fc.integer({ min: 1, max: 50 }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  instanceId: fc.constant(undefined),
});

/**
 * Generator for cook session input with required times (for statistics tests)
 */
export const cookSessionWithTimesArb = (recipeId: string): fc.Arbitrary<CookSessionInput> => fc.record({
  recipeId: fc.constant(recipeId),
  date: dateArb,
  actualPrepMinutes: fc.integer({ min: 1, max: 480 }),
  actualCookMinutes: fc.integer({ min: 1, max: 480 }),
  servingsMade: fc.integer({ min: 1, max: 50 }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  instanceId: fc.constant(undefined),
});

/**
 * Generator for rating value (1-5)
 */
export const ratingValueArb = fc.integer({ min: 1, max: 5 });

/**
 * Generator for rating input
 */
export const ratingInputArb = (recipeId: string): fc.Arbitrary<RatingInput> => fc.record({
  recipeId: fc.constant(recipeId),
  rating: ratingValueArb,
});


/**
 * Photo-related generators
 */

import type { PhotoInput, SupportedImageFormat } from '../../src/types/photo.js';
import type { InstanceConfig } from '../../src/types/instance.js';
import type { UnitSystem } from '../../src/types/units.js';

/**
 * All supported image formats
 */
const SUPPORTED_FORMATS: SupportedImageFormat[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
];

/**
 * Generator for supported image format
 */
export const supportedImageFormatArb = fc.constantFrom(...SUPPORTED_FORMATS);

/**
 * Generator for unsupported image format
 */
export const unsupportedImageFormatArb = fc.constantFrom(
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
  'application/pdf'
);

/**
 * Generator for photo filename
 */
export const photoFilenameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('/') && !s.includes('\\'))
  .map(s => `${s}.jpg`);

/**
 * Generator for photo input with supported format
 */
export const photoInputArb: fc.Arbitrary<PhotoInput> = fc.record({
  data: fc.string({ minLength: 10, maxLength: 100 }), // Simulated base64 data
  filename: photoFilenameArb,
  mimeType: supportedImageFormatArb,
  instanceId: fc.constant(undefined),
  metadata: fc.option(
    fc.record({
      caption: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      step: fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined }),
    }),
    { nil: undefined }
  ),
  width: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
  height: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
  takenAt: fc.option(dateArb, { nil: undefined }),
});

/**
 * Generator for photo input with specific format
 */
export const photoInputWithFormatArb = (format: SupportedImageFormat): fc.Arbitrary<PhotoInput> =>
  fc.record({
    data: fc.string({ minLength: 10, maxLength: 100 }),
    filename: photoFilenameArb,
    mimeType: fc.constant(format),
    instanceId: fc.constant(undefined),
    metadata: fc.option(
      fc.record({
        caption: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        step: fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined }),
      }),
      { nil: undefined }
    ),
    width: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
    height: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
    takenAt: fc.option(dateArb, { nil: undefined }),
  });

/**
 * Generator for unit system
 */
export const unitSystemArb: fc.Arbitrary<UnitSystem> = fc.constantFrom('us', 'metric');

/**
 * Generator for instance configuration
 */
export const instanceConfigArb: fc.Arbitrary<InstanceConfig> = fc.record({
  scaleFactor: fc.option(fc.double({ min: 0.25, max: 4, noNaN: true }), { nil: undefined }),
  unitSystem: fc.option(unitSystemArb, { nil: undefined }),
  servings: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  modifications: fc.constant(undefined), // Keep simple for now
});


/**
 * Visual Parser-related generators
 */

import type {
  VisualParserImageFormat,
  VisualParseOptions,
  FieldConfidence,
  VisualParseResult,
} from '../../src/types/visual-parser.js';
import type { ParsedRecipe } from '../../src/services/recipe-parser.js';

/**
 * All supported visual parser image formats
 */
const VISUAL_PARSER_FORMATS: VisualParserImageFormat[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/tiff',
];

/**
 * Generator for visual parser supported image format
 */
export const visualParserFormatArb = fc.constantFrom(...VISUAL_PARSER_FORMATS);

/**
 * Generator for visual parse options
 */
export const visualParseOptionsArb: fc.Arbitrary<VisualParseOptions> = fc.record({
  language: fc.option(fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'ja', 'zh'), { nil: undefined }),
  recipeType: fc.option(fc.constantFrom('handwritten', 'printed', 'screenshot'), { nil: undefined }),
});

/**
 * Generator for confidence value (0-1)
 */
export const confidenceArb = fc.double({ min: 0, max: 1, noNaN: true });

/**
 * Generator for field confidence
 */
export const fieldConfidenceArb: fc.Arbitrary<FieldConfidence> = fc.record({
  title: confidenceArb,
  ingredients: confidenceArb,
  instructions: confidenceArb,
  prepTime: confidenceArb,
  cookTime: confidenceArb,
  servings: confidenceArb,
});

/**
 * Generator for parsed recipe (from visual parsing)
 */
export const parsedRecipeArb: fc.Arbitrary<ParsedRecipe> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  ingredients: fc.array(
    fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    { minLength: 1, maxLength: 20 }
  ),
  instructions: fc.array(
    fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    { minLength: 1, maxLength: 15 }
  ),
  prepTime: fc.option(fc.record({ minutes: fc.integer({ min: 1, max: 480 }) }), { nil: undefined }),
  cookTime: fc.option(fc.record({ minutes: fc.integer({ min: 1, max: 480 }) }), { nil: undefined }),
  servings: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
  imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

/**
 * Generator for visual parse result
 */
export const visualParseResultArb: fc.Arbitrary<VisualParseResult> = fc.record({
  success: fc.boolean(),
  recipe: fc.option(parsedRecipeArb, { nil: undefined }),
  confidence: confidenceArb,
  fieldConfidence: fieldConfidenceArb,
  warnings: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
    { nil: undefined }
  ),
  rawText: fc.option(fc.string({ maxLength: 2000 }), { nil: undefined }),
  errors: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 3 }),
    { nil: undefined }
  ),
});

/**
 * Generator for confidence threshold (0-1)
 */
export const confidenceThresholdArb = fc.double({ min: 0.1, max: 0.9, noNaN: true });


/**
 * Additional utility generators for comprehensive testing
 */

/**
 * Generator for menu assignment input (requires recipeId)
 */
export const menuAssignmentInputArb = (
  recipeId: string,
  menuDateRange?: { startDate: Date; endDate: Date }
): fc.Arbitrary<MenuAssignmentInput> => {
  const dateGen = menuDateRange
    ? fc.date({ min: menuDateRange.startDate, max: menuDateRange.endDate })
    : dateArb;

  return fc.record({
    recipeId: fc.constant(recipeId),
    date: dateGen,
    mealSlot: mealSlotArb,
    servings: fc.option(servingsArb, { nil: undefined }),
    cookDate: fc.option(dateGen, { nil: undefined }),
    leftoverDurationDays: fc.option(leftoverDurationArb, { nil: undefined }),
  });
};

/**
 * Generator for multiple menu assignments
 */
export const menuAssignmentsArb = (
  recipeIds: string[],
  count: number = 5
): fc.Arbitrary<MenuAssignmentInput[]> => {
  if (recipeIds.length === 0) {
    return fc.constant([]);
  }

  return fc.array(
    fc.record({
      recipeId: fc.constantFrom(...recipeIds),
      date: dateArb,
      mealSlot: mealSlotArb,
      servings: fc.option(servingsArb, { nil: undefined }),
      cookDate: fc.option(dateArb, { nil: undefined }),
      leftoverDurationDays: fc.option(leftoverDurationArb, { nil: undefined }),
    }),
    { minLength: 1, maxLength: count }
  );
};

/**
 * Generator for scale factor (positive, reasonable range)
 */
export const scaleFactorArb = fc.double({ min: 0.25, max: 10, noNaN: true });

/**
 * Generator for small scale factor (for precision tests)
 */
export const smallScaleFactorArb = fc.double({ min: 0.1, max: 2, noNaN: true });

/**
 * Generator for large scale factor (for edge case tests)
 */
export const largeScaleFactorArb = fc.double({ min: 5, max: 100, noNaN: true });

/**
 * Generator for US volume units
 */
export const usVolumeUnitArb = fc.constantFrom<Unit>('tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon');

/**
 * Generator for metric volume units
 */
export const metricVolumeUnitArb = fc.constantFrom<Unit>('ml', 'l');

/**
 * Generator for US weight units
 */
export const usWeightUnitArb = fc.constantFrom<Unit>('oz', 'lb');

/**
 * Generator for metric weight units
 */
export const metricWeightUnitArb = fc.constantFrom<Unit>('g', 'kg');

/**
 * Generator for convertible units (volume or weight)
 */
export const convertibleUnitArb = fc.oneof(
  usVolumeUnitArb,
  metricVolumeUnitArb,
  usWeightUnitArb,
  metricWeightUnitArb
);

/**
 * Generator for non-convertible units
 */
export const nonConvertibleUnitArb = fc.constantFrom<Unit>('piece', 'dozen', 'pinch', 'dash', 'to_taste');

/**
 * Generator for ingredient with specific unit type
 */
export const ingredientWithUnitArb = (unitGen: fc.Arbitrary<Unit>): fc.Arbitrary<IngredientInput> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    quantity: fc.double({ min: 0.01, max: 1000, noNaN: true }),
    unit: unitGen,
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    category: fc.option(categoryArb, { nil: undefined }),
  });

/**
 * Generator for recipe with specific characteristics
 */
export const recipeWithCharacteristicsArb = (options: {
  minIngredients?: number;
  maxIngredients?: number;
  minInstructions?: number;
  maxInstructions?: number;
  maxPrepTime?: number;
  maxCookTime?: number;
  tags?: string[];
}): fc.Arbitrary<RecipeInput> => {
  const {
    minIngredients = 1,
    maxIngredients = 10,
    minInstructions = 1,
    maxInstructions = 10,
    maxPrepTime = 120,
    maxCookTime = 120,
    tags,
  } = options;

  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    ingredients: fc.array(ingredientInputArb, { minLength: minIngredients, maxLength: maxIngredients }),
    instructions: fc.array(instructionInputArb, { minLength: minInstructions, maxLength: maxInstructions }),
    prepTimeMinutes: fc.integer({ min: 0, max: maxPrepTime }),
    cookTimeMinutes: fc.integer({ min: 0, max: maxCookTime }),
    servings: fc.integer({ min: 1, max: 20 }),
    tags: tags ? fc.constant(tags) : fc.option(fc.array(tagArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
    sourceUrl: fc.constant(undefined),
    folderId: fc.constant(undefined),
    parentRecipeId: fc.constant(undefined),
  });
};

/**
 * Generator for quick recipe (under 30 minutes total)
 */
export const quickRecipeArb = recipeWithCharacteristicsArb({
  maxIngredients: 8,
  maxInstructions: 6,
  maxPrepTime: 15,
  maxCookTime: 15,
  tags: ['quick'],
});

/**
 * Generator for complex recipe (many ingredients and steps)
 */
export const complexRecipeArb = recipeWithCharacteristicsArb({
  minIngredients: 10,
  maxIngredients: 30,
  minInstructions: 8,
  maxInstructions: 20,
  maxPrepTime: 120,
  maxCookTime: 240,
});

/**
 * Generator for year (for statistics tests)
 */
export const yearArb = fc.integer({ min: 2020, max: 2030 });

/**
 * Generator for month (1-12)
 */
export const monthArb = fc.integer({ min: 1, max: 12 });

/**
 * Generator for day of month (1-28 to avoid edge cases)
 */
export const dayArb = fc.integer({ min: 1, max: 28 });

/**
 * Generator for date in specific year
 */
export const dateInYearArb = (year: number): fc.Arbitrary<Date> =>
  fc.tuple(monthArb, dayArb).map(([month, day]) => new Date(year, month - 1, day));

/**
 * Generator for multiple cook sessions for a recipe
 */
export const multipleCookSessionsArb = (
  recipeId: string,
  count: number = 5
): fc.Arbitrary<CookSessionInput[]> =>
  fc.array(cookSessionWithTimesArb(recipeId), { minLength: count, maxLength: count });

/**
 * Generator for rating history (multiple ratings over time)
 */
export const ratingHistoryArb = (
  recipeId: string,
  count: number = 3
): fc.Arbitrary<RatingInput[]> =>
  fc.array(ratingInputArb(recipeId), { minLength: count, maxLength: count });

/**
 * Generator for preference key-value pair
 */
export const preferenceArb = fc.record({
  key: fc.constantFrom('unitSystem', 'defaultServings', 'leftoverDuration', 'theme'),
  value: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Generator for user preferences object
 */
export const userPreferencesArb = fc.record({
  unitSystem: unitSystemArb,
  defaultServings: servingsArb,
  leftoverDurationDays: leftoverDurationArb,
});

/**
 * Generator for folder name
 */
export const folderNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Generator for search query
 */
export const searchQueryArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Generator for export options
 */
export const exportOptionsArb = fc.record({
  includePhotos: fc.boolean(),
  includeHistory: fc.boolean(),
  includeRatings: fc.boolean(),
});

/**
 * Utility: Generate N unique items from an arbitrary
 */
export function uniqueArrayArb<T>(
  arb: fc.Arbitrary<T>,
  count: number,
  keyFn: (item: T) => string
): fc.Arbitrary<T[]> {
  return fc.array(arb, { minLength: count * 2, maxLength: count * 3 })
    .map(items => {
      const seen = new Set<string>();
      const unique: T[] = [];
      for (const item of items) {
        const key = keyFn(item);
        if (!seen.has(key) && unique.length < count) {
          seen.add(key);
          unique.push(item);
        }
      }
      return unique;
    })
    .filter(items => items.length >= count);
}

/**
 * Utility: Generate a recipe with specific tags
 */
export const recipeWithTagsArb = (tags: string[]): fc.Arbitrary<RecipeInput> =>
  minimalRecipeInputArb.map(recipe => ({
    ...recipe,
    tags,
  }));

/**
 * Utility: Generate a recipe with specific rating
 */
export const recipeForRatingArb = (rating: number): fc.Arbitrary<{ recipe: RecipeInput; rating: number }> =>
  minimalRecipeInputArb.map(recipe => ({
    recipe,
    rating: Math.max(1, Math.min(5, rating)),
  }));
