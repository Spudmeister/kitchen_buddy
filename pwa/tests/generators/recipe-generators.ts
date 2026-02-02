/**
 * Property-based test generators for recipes
 * 
 * Provides arbitraries for generating random recipe data for testing.
 */

import * as fc from 'fast-check';
import type { RecipeInput, IngredientInput, InstructionInput, IngredientCategory } from '../../src/types/recipe';
import type { Unit } from '../../src/types/units';

/**
 * Valid units for ingredients
 */
const VALID_UNITS: Unit[] = [
  'cup', 'tbsp', 'tsp', 'fl_oz', 'pint', 'quart', 'gallon',
  'ml', 'l', 'oz', 'lb', 'g', 'kg', 'piece', 'dozen',
  'pinch', 'dash', 'to_taste',
];

/**
 * Valid ingredient categories
 */
const VALID_CATEGORIES: IngredientCategory[] = [
  'produce', 'meat', 'seafood', 'dairy', 'bakery',
  'frozen', 'pantry', 'spices', 'beverages', 'other',
];

/**
 * Arbitrary for generating a valid unit
 */
export const unitArb = fc.constantFrom(...VALID_UNITS);

/**
 * Arbitrary for generating a valid ingredient category
 */
export const categoryArb = fc.constantFrom(...VALID_CATEGORIES);

/**
 * Arbitrary for generating ingredient input
 */
export const ingredientInputArb: fc.Arbitrary<IngredientInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  quantity: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
  unit: unitArb,
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  category: fc.option(categoryArb, { nil: undefined }),
});

/**
 * Arbitrary for generating instruction input
 */
export const instructionInputArb: fc.Arbitrary<InstructionInput> = fc.record({
  text: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  durationMinutes: fc.option(fc.integer({ min: 1, max: 480 }), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

/**
 * Arbitrary for generating a minimal recipe input (for basic tests)
 */
export const minimalRecipeInputArb: fc.Arbitrary<RecipeInput> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  ingredients: fc.array(ingredientInputArb, { minLength: 1, maxLength: 20 }),
  instructions: fc.array(instructionInputArb, { minLength: 1, maxLength: 30 }),
  prepTimeMinutes: fc.integer({ min: 0, max: 480 }),
  cookTimeMinutes: fc.integer({ min: 0, max: 480 }),
  servings: fc.integer({ min: 1, max: 100 }),
  tags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { maxLength: 10 }),
    { nil: undefined }
  ),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
  folderId: fc.constant(undefined),
  parentRecipeId: fc.constant(undefined),
});

/**
 * Arbitrary for generating a complete recipe input (for comprehensive tests)
 */
export const fullRecipeInputArb: fc.Arbitrary<RecipeInput> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 1000 }),
  ingredients: fc.array(ingredientInputArb, { minLength: 1, maxLength: 20 }),
  instructions: fc.array(instructionInputArb, { minLength: 1, maxLength: 30 }),
  prepTimeMinutes: fc.integer({ min: 1, max: 480 }),
  cookTimeMinutes: fc.integer({ min: 1, max: 480 }),
  servings: fc.integer({ min: 1, max: 100 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
  folderId: fc.constant(undefined),
  parentRecipeId: fc.constant(undefined),
});
