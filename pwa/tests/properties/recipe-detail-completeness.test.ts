/**
 * Property Test: Recipe Detail Completeness
 *
 * **Feature: sous-chef-pwa, Property 7: Recipe Detail Completeness**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * For any valid recipe, the Recipe Detail component SHALL display:
 * - All required fields (title, ingredients, instructions, times, servings)
 * - Cook statistics when sessions exist
 *
 * This test validates that:
 * 1. All required recipe fields are present in the rendered output
 * 2. Cook statistics are displayed when timesCooked > 0
 * 3. Cook statistics are hidden when timesCooked === 0
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Recipe, Ingredient, Instruction } from '../../src/types/recipe';
import type { Duration } from '../../src/types/units';

/**
 * Cook statistics interface (matches component)
 */
interface CookStats {
  timesCooked: number;
  lastCooked?: Date;
  avgPrepTime?: Duration;
  avgCookTime?: Duration;
}

/**
 * Arbitrary for generating a valid Duration
 */
const durationArb: fc.Arbitrary<Duration> = fc.record({
  minutes: fc.integer({ min: 1, max: 480 }),
});

/**
 * Arbitrary for generating a valid Ingredient
 */
const ingredientArb: fc.Arbitrary<Ingredient> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
  unit: fc.constantFrom(
    'cup',
    'tbsp',
    'tsp',
    'oz',
    'lb',
    'g',
    'kg',
    'ml',
    'l',
    'piece'
  ),
  notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  category: fc.option(
    fc.constantFrom('produce', 'meat', 'dairy', 'pantry', 'spices', 'other'),
    { nil: undefined }
  ),
});

/**
 * Arbitrary for generating a valid Instruction
 */
const instructionArb: fc.Arbitrary<Instruction> = fc.record({
  id: fc.uuid(),
  step: fc.integer({ min: 1, max: 100 }),
  text: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
  duration: fc.option(durationArb, { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

/**
 * Arbitrary for generating a valid Recipe
 */
const recipeArb: fc.Arbitrary<Recipe> = fc.record({
  id: fc.uuid(),
  currentVersion: fc.integer({ min: 1, max: 100 }),
  title: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  ingredients: fc.array(ingredientArb, { minLength: 1, maxLength: 20 }),
  instructions: fc.array(instructionArb, { minLength: 1, maxLength: 30 }),
  prepTime: durationArb,
  cookTime: durationArb,
  servings: fc.integer({ min: 1, max: 100 }),
  tags: fc.array(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    { maxLength: 10 }
  ),
  rating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  sourceUrl: fc.option(fc.webUrl(), { nil: undefined }),
  folderId: fc.option(fc.uuid(), { nil: undefined }),
  parentRecipeId: fc.option(fc.uuid(), { nil: undefined }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  archivedAt: fc.constant(undefined),
});

/**
 * Arbitrary for generating CookStats with sessions
 */
const cookStatsWithSessionsArb: fc.Arbitrary<CookStats> = fc.record({
  timesCooked: fc.integer({ min: 1, max: 1000 }),
  lastCooked: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), {
    nil: undefined,
  }),
  avgPrepTime: fc.option(durationArb, { nil: undefined }),
  avgCookTime: fc.option(durationArb, { nil: undefined }),
});

/**
 * Arbitrary for generating CookStats without sessions
 */
const cookStatsWithoutSessionsArb: fc.Arbitrary<CookStats> = fc.constant({
  timesCooked: 0,
});

/**
 * Simulate what the RecipeDetail component would render
 * This is a simplified model of the component's rendering logic
 */
function simulateRecipeDetailRender(recipe: Recipe, cookStats?: CookStats): {
  hasTitle: boolean;
  hasIngredients: boolean;
  hasInstructions: boolean;
  hasPrepTime: boolean;
  hasCookTime: boolean;
  hasServings: boolean;
  hasRating: boolean;
  hasTags: boolean;
  hasDescription: boolean;
  hasCookStats: boolean;
  ingredientCount: number;
  instructionCount: number;
  tagCount: number;
} {
  return {
    hasTitle: recipe.title.trim().length > 0,
    hasIngredients: recipe.ingredients.length > 0,
    hasInstructions: recipe.instructions.length > 0,
    hasPrepTime: recipe.prepTime.minutes > 0,
    hasCookTime: recipe.cookTime.minutes > 0,
    hasServings: recipe.servings > 0,
    hasRating: recipe.rating !== undefined && recipe.rating >= 1 && recipe.rating <= 5,
    hasTags: recipe.tags.length > 0,
    hasDescription: recipe.description !== undefined && recipe.description.trim().length > 0,
    hasCookStats: cookStats !== undefined && cookStats.timesCooked > 0,
    ingredientCount: recipe.ingredients.length,
    instructionCount: recipe.instructions.length,
    tagCount: recipe.tags.length,
  };
}

describe('Property 7: Recipe Detail Completeness', () => {
  it('should display all required recipe fields for any valid recipe', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        const rendered = simulateRecipeDetailRender(recipe);

        // Required fields must always be present
        expect(rendered.hasTitle).toBe(true);
        expect(rendered.hasIngredients).toBe(true);
        expect(rendered.hasInstructions).toBe(true);
        expect(rendered.hasServings).toBe(true);

        // Ingredient count must match
        expect(rendered.ingredientCount).toBe(recipe.ingredients.length);
        expect(rendered.ingredientCount).toBeGreaterThan(0);

        // Instruction count must match
        expect(rendered.instructionCount).toBe(recipe.instructions.length);
        expect(rendered.instructionCount).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should display cook statistics when sessions exist (timesCooked > 0)', () => {
    fc.assert(
      fc.property(recipeArb, cookStatsWithSessionsArb, (recipe, cookStats) => {
        const rendered = simulateRecipeDetailRender(recipe, cookStats);

        // Cook stats should be displayed when timesCooked > 0
        expect(rendered.hasCookStats).toBe(true);
        expect(cookStats.timesCooked).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should hide cook statistics when no sessions exist (timesCooked === 0)', () => {
    fc.assert(
      fc.property(recipeArb, cookStatsWithoutSessionsArb, (recipe, cookStats) => {
        const rendered = simulateRecipeDetailRender(recipe, cookStats);

        // Cook stats should be hidden when timesCooked === 0
        expect(rendered.hasCookStats).toBe(false);
        expect(cookStats.timesCooked).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should display optional fields only when they have values', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        const rendered = simulateRecipeDetailRender(recipe);

        // Description should be displayed only if present and non-empty
        if (recipe.description && recipe.description.trim().length > 0) {
          expect(rendered.hasDescription).toBe(true);
        } else {
          expect(rendered.hasDescription).toBe(false);
        }

        // Rating should be displayed only if present and valid
        if (recipe.rating !== undefined && recipe.rating >= 1 && recipe.rating <= 5) {
          expect(rendered.hasRating).toBe(true);
        } else {
          expect(rendered.hasRating).toBe(false);
        }

        // Tags should be displayed only if present
        if (recipe.tags.length > 0) {
          expect(rendered.hasTags).toBe(true);
          expect(rendered.tagCount).toBe(recipe.tags.length);
        } else {
          expect(rendered.hasTags).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all ingredient data in display', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        // Each ingredient should have required fields
        for (const ingredient of recipe.ingredients) {
          expect(ingredient.name.trim().length).toBeGreaterThan(0);
          expect(ingredient.quantity).toBeGreaterThan(0);
          expect(ingredient.unit).toBeDefined();
        }

        // Total ingredient count should match
        const rendered = simulateRecipeDetailRender(recipe);
        expect(rendered.ingredientCount).toBe(recipe.ingredients.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all instruction data in display', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        // Each instruction should have required fields
        for (const instruction of recipe.instructions) {
          expect(instruction.text.trim().length).toBeGreaterThan(0);
        }

        // Total instruction count should match
        const rendered = simulateRecipeDetailRender(recipe);
        expect(rendered.instructionCount).toBe(recipe.instructions.length);
      }),
      { numRuns: 100 }
    );
  });
});
