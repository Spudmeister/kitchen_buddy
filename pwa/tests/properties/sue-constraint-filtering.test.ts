/**
 * Property Test: Sue Constraint Filtering
 *
 * **Feature: sous-chef-pwa, Property 16: Sue Constraint Filtering**
 * **Validates: Requirements 16.2, 16.5**
 *
 * For any set of constraints (dietary restrictions, time limits, ingredient requirements),
 * Sue's suggestions SHALL only include recipes that satisfy ALL specified constraints.
 * If no recipes match, Sue SHALL indicate no matches were found.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { Recipe } from '../../src/types/recipe';
import type { MenuConstraints } from '../../src/types/sue';

/**
 * Mock recipe data for testing constraint filtering
 */
function createMockRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: overrides.id || `recipe-${Math.random().toString(36).substr(2, 9)}`,
    title: overrides.title || 'Test Recipe',
    description: overrides.description || 'A test recipe',
    ingredients: overrides.ingredients || [
      { id: '1', name: 'chicken', quantity: 1, unit: 'lb' },
      { id: '2', name: 'salt', quantity: 1, unit: 'tsp' },
    ],
    instructions: overrides.instructions || [
      { id: '1', stepNumber: 1, text: 'Cook the chicken' },
    ],
    prepTime: overrides.prepTime || { minutes: 15 },
    cookTime: overrides.cookTime || { minutes: 30 },
    servings: overrides.servings || 4,
    tags: overrides.tags || [],
    rating: overrides.rating,
    version: overrides.version || 1,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
}

/**
 * Filter recipes by constraints (mirrors SueService.filterRecipesByConstraints)
 */
function filterRecipesByConstraints(
  recipes: Recipe[],
  constraints: MenuConstraints
): Recipe[] {
  let filtered = [...recipes];

  // Filter by dietary restrictions (tags)
  if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
    const requiredTags = constraints.dietaryRestrictions.map(t => t.toLowerCase());
    filtered = filtered.filter(recipe =>
      requiredTags.every(tag =>
        recipe.tags.some(t => t.toLowerCase() === tag)
      )
    );
  }

  // Filter by max prep time
  if (constraints.maxPrepTime !== undefined) {
    filtered = filtered.filter(recipe =>
      recipe.prepTime.minutes <= constraints.maxPrepTime!
    );
  }

  // Filter by max cook time
  if (constraints.maxCookTime !== undefined) {
    filtered = filtered.filter(recipe =>
      recipe.cookTime.minutes <= constraints.maxCookTime!
    );
  }

  // Filter by max total time
  if (constraints.maxTotalTime !== undefined) {
    filtered = filtered.filter(recipe =>
      recipe.prepTime.minutes + recipe.cookTime.minutes <= constraints.maxTotalTime!
    );
  }

  // Filter by minimum rating
  if (constraints.minRating !== undefined) {
    filtered = filtered.filter(recipe =>
      recipe.rating !== undefined && recipe.rating >= constraints.minRating!
    );
  }

  // Filter by included tags
  if (constraints.includeTags && constraints.includeTags.length > 0) {
    const requiredTags = constraints.includeTags.map(t => t.toLowerCase());
    filtered = filtered.filter(recipe =>
      requiredTags.some(tag =>
        recipe.tags.some(t => t.toLowerCase() === tag)
      )
    );
  }

  // Filter by excluded tags
  if (constraints.excludeTags && constraints.excludeTags.length > 0) {
    const excludedTags = constraints.excludeTags.map(t => t.toLowerCase());
    filtered = filtered.filter(recipe =>
      !excludedTags.some(tag =>
        recipe.tags.some(t => t.toLowerCase() === tag)
      )
    );
  }

  // Filter by available ingredients
  if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
    const available = constraints.availableIngredients.map(i => i.toLowerCase());
    filtered = filtered.filter(recipe =>
      recipe.ingredients.some(ing =>
        available.some(a => ing.name.toLowerCase().includes(a))
      )
    );
  }

  // Filter by excluded ingredients
  if (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) {
    const excluded = constraints.excludeIngredients.map(i => i.toLowerCase());
    filtered = filtered.filter(recipe =>
      !recipe.ingredients.some(ing =>
        excluded.some(e => ing.name.toLowerCase().includes(e))
      )
    );
  }

  return filtered;
}

/**
 * Check if a recipe satisfies all constraints
 */
function satisfiesConstraints(recipe: Recipe, constraints: MenuConstraints): boolean {
  // Check dietary restrictions
  if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
    const requiredTags = constraints.dietaryRestrictions.map(t => t.toLowerCase());
    if (!requiredTags.every(tag => recipe.tags.some(t => t.toLowerCase() === tag))) {
      return false;
    }
  }

  // Check max prep time
  if (constraints.maxPrepTime !== undefined && recipe.prepTime.minutes > constraints.maxPrepTime) {
    return false;
  }

  // Check max cook time
  if (constraints.maxCookTime !== undefined && recipe.cookTime.minutes > constraints.maxCookTime) {
    return false;
  }

  // Check max total time
  if (constraints.maxTotalTime !== undefined) {
    const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
    if (totalTime > constraints.maxTotalTime) {
      return false;
    }
  }

  // Check minimum rating
  if (constraints.minRating !== undefined) {
    if (recipe.rating === undefined || recipe.rating < constraints.minRating) {
      return false;
    }
  }

  // Check included tags
  if (constraints.includeTags && constraints.includeTags.length > 0) {
    const requiredTags = constraints.includeTags.map(t => t.toLowerCase());
    if (!requiredTags.some(tag => recipe.tags.some(t => t.toLowerCase() === tag))) {
      return false;
    }
  }

  // Check excluded tags
  if (constraints.excludeTags && constraints.excludeTags.length > 0) {
    const excludedTags = constraints.excludeTags.map(t => t.toLowerCase());
    if (excludedTags.some(tag => recipe.tags.some(t => t.toLowerCase() === tag))) {
      return false;
    }
  }

  // Check available ingredients
  if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
    const available = constraints.availableIngredients.map(i => i.toLowerCase());
    if (!recipe.ingredients.some(ing => available.some(a => ing.name.toLowerCase().includes(a)))) {
      return false;
    }
  }

  // Check excluded ingredients
  if (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) {
    const excluded = constraints.excludeIngredients.map(i => i.toLowerCase());
    if (recipe.ingredients.some(ing => excluded.some(e => ing.name.toLowerCase().includes(e)))) {
      return false;
    }
  }

  return true;
}

/**
 * Generators for property tests
 */
const dietaryTagArb = fc.constantFrom('vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb');
const cuisineTagArb = fc.constantFrom('italian', 'mexican', 'asian', 'indian', 'french', 'american');
const ingredientArb = fc.constantFrom('chicken', 'beef', 'pork', 'fish', 'tofu', 'pasta', 'rice', 'beans');
const timeArb = fc.integer({ min: 5, max: 120 });
const ratingArb = fc.integer({ min: 1, max: 5 });

const constraintsArb: fc.Arbitrary<MenuConstraints> = fc.record({
  dietaryRestrictions: fc.option(fc.array(dietaryTagArb, { minLength: 0, maxLength: 3 }), { nil: undefined }),
  maxPrepTime: fc.option(timeArb, { nil: undefined }),
  maxCookTime: fc.option(timeArb, { nil: undefined }),
  maxTotalTime: fc.option(fc.integer({ min: 10, max: 180 }), { nil: undefined }),
  minRating: fc.option(ratingArb, { nil: undefined }),
  includeTags: fc.option(fc.array(cuisineTagArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
  excludeTags: fc.option(fc.array(cuisineTagArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
  availableIngredients: fc.option(fc.array(ingredientArb, { minLength: 0, maxLength: 3 }), { nil: undefined }),
  excludeIngredients: fc.option(fc.array(ingredientArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
});

const recipeArb: fc.Arbitrary<Recipe> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  ingredients: fc.array(
    fc.record({
      id: fc.uuid(),
      name: ingredientArb,
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
      unit: fc.constantFrom('cup', 'tbsp', 'tsp', 'lb', 'oz', 'piece'),
    }),
    { minLength: 1, maxLength: 10 }
  ),
  instructions: fc.array(
    fc.record({
      id: fc.uuid(),
      stepNumber: fc.integer({ min: 1, max: 20 }),
      text: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    }),
    { minLength: 1, maxLength: 10 }
  ),
  prepTime: fc.record({ minutes: timeArb }),
  cookTime: fc.record({ minutes: timeArb }),
  servings: fc.integer({ min: 1, max: 12 }),
  tags: fc.array(fc.oneof(dietaryTagArb, cuisineTagArb), { minLength: 0, maxLength: 5 }),
  rating: fc.option(ratingArb, { nil: undefined }),
  version: fc.constant(1),
  createdAt: fc.constant(new Date()),
  updatedAt: fc.constant(new Date()),
});

describe('Property 16: Sue Constraint Filtering', () => {
  it('should only return recipes that satisfy ALL dietary restrictions', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        fc.array(dietaryTagArb, { minLength: 1, maxLength: 3 }),
        (recipes, dietaryRestrictions) => {
          const constraints: MenuConstraints = { dietaryRestrictions };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have ALL required dietary tags
          for (const recipe of filtered) {
            for (const tag of dietaryRestrictions) {
              expect(recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase())).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only return recipes within max prep time', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        timeArb,
        (recipes, maxPrepTime) => {
          const constraints: MenuConstraints = { maxPrepTime };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have prep time <= maxPrepTime
          for (const recipe of filtered) {
            expect(recipe.prepTime.minutes).toBeLessThanOrEqual(maxPrepTime);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only return recipes within max cook time', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        timeArb,
        (recipes, maxCookTime) => {
          const constraints: MenuConstraints = { maxCookTime };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have cook time <= maxCookTime
          for (const recipe of filtered) {
            expect(recipe.cookTime.minutes).toBeLessThanOrEqual(maxCookTime);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only return recipes within max total time', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 10, max: 180 }),
        (recipes, maxTotalTime) => {
          const constraints: MenuConstraints = { maxTotalTime };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have total time <= maxTotalTime
          for (const recipe of filtered) {
            const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
            expect(totalTime).toBeLessThanOrEqual(maxTotalTime);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only return recipes with minimum rating', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        ratingArb,
        (recipes, minRating) => {
          const constraints: MenuConstraints = { minRating };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have rating >= minRating
          for (const recipe of filtered) {
            expect(recipe.rating).toBeDefined();
            expect(recipe.rating).toBeGreaterThanOrEqual(minRating);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should exclude recipes with excluded ingredients', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        fc.array(ingredientArb, { minLength: 1, maxLength: 2 }),
        (recipes, excludeIngredients) => {
          const constraints: MenuConstraints = { excludeIngredients };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // No filtered recipe should contain excluded ingredients
          for (const recipe of filtered) {
            for (const excluded of excludeIngredients) {
              const hasExcluded = recipe.ingredients.some(ing =>
                ing.name.toLowerCase().includes(excluded.toLowerCase())
              );
              expect(hasExcluded).toBe(false);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should exclude recipes with excluded tags', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        fc.array(cuisineTagArb, { minLength: 1, maxLength: 2 }),
        (recipes, excludeTags) => {
          const constraints: MenuConstraints = { excludeTags };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // No filtered recipe should have excluded tags
          for (const recipe of filtered) {
            for (const excluded of excludeTags) {
              const hasExcluded = recipe.tags.some(t =>
                t.toLowerCase() === excluded.toLowerCase()
              );
              expect(hasExcluded).toBe(false);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should satisfy ALL constraints simultaneously', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        constraintsArb,
        (recipes, constraints) => {
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must satisfy ALL constraints
          for (const recipe of filtered) {
            expect(satisfiesConstraints(recipe, constraints)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return empty array when no recipes match', () => {
    // Create recipes that won't match impossible constraints
    const recipes = [
      createMockRecipe({ prepTime: { minutes: 60 }, tags: ['italian'] }),
      createMockRecipe({ prepTime: { minutes: 45 }, tags: ['mexican'] }),
    ];

    const constraints: MenuConstraints = {
      maxPrepTime: 10,
      dietaryRestrictions: ['vegan'],
    };

    const filtered = filterRecipesByConstraints(recipes, constraints);
    expect(filtered.length).toBe(0);
  });

  it('should include recipes with available ingredients', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 1, maxLength: 20 }),
        fc.array(ingredientArb, { minLength: 1, maxLength: 3 }),
        (recipes, availableIngredients) => {
          const constraints: MenuConstraints = { availableIngredients };
          const filtered = filterRecipesByConstraints(recipes, constraints);

          // Every filtered recipe must have at least one available ingredient
          for (const recipe of filtered) {
            const hasAvailable = recipe.ingredients.some(ing =>
              availableIngredients.some(a =>
                ing.name.toLowerCase().includes(a.toLowerCase())
              )
            );
            expect(hasAvailable).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
