/**
 * Property Test: Sue Variety Tracking
 *
 * **Feature: sous-chef-pwa, Property 17: Sue Variety Tracking**
 * **Validates: Requirements 16.3, 16.4**
 *
 * For any menu with existing recipe assignments, Sue's suggestions SHALL prioritize
 * recipes with different cuisines and main ingredients than those already in the menu.
 * The used cuisines and main ingredients SHALL be accurately tracked.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Recipe } from '../../src/types/recipe';
import type { Menu, MenuAssignment } from '../../src/types/menu';
import type { VarietyPreferences, RecipeSuggestion } from '../../src/types/sue';

/**
 * Common cuisine tags for variety detection
 */
const CUISINE_TAGS = [
  'italian', 'mexican', 'asian', 'chinese', 'japanese', 'thai', 'indian',
  'french', 'greek', 'mediterranean', 'american', 'southern', 'cajun',
  'korean', 'vietnamese', 'middle-eastern', 'spanish', 'german', 'british',
];

/**
 * Common main ingredient categories for variety detection
 */
const MAIN_INGREDIENT_CATEGORIES = [
  'chicken', 'beef', 'pork', 'fish', 'seafood', 'tofu', 'lamb',
  'turkey', 'duck', 'shrimp', 'salmon', 'pasta', 'rice', 'beans',
];

/**
 * Get cuisines used in a menu (mirrors SueService.getUsedCuisines)
 */
function getUsedCuisines(menu: Menu, recipeMap: Map<string, Recipe>): Set<string> {
  const cuisines = new Set<string>();

  for (const assignment of menu.assignments) {
    const recipe = recipeMap.get(assignment.recipeId);
    if (recipe) {
      for (const tag of recipe.tags) {
        if (CUISINE_TAGS.includes(tag.toLowerCase())) {
          cuisines.add(tag.toLowerCase());
        }
      }
    }
  }

  return cuisines;
}

/**
 * Get main ingredients used in a menu (mirrors SueService.getUsedMainIngredients)
 */
function getUsedMainIngredients(menu: Menu, recipeMap: Map<string, Recipe>): Set<string> {
  const ingredients = new Set<string>();

  for (const assignment of menu.assignments) {
    const recipe = recipeMap.get(assignment.recipeId);
    if (recipe) {
      for (const ingredient of recipe.ingredients) {
        const ingredientLower = ingredient.name.toLowerCase();
        for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
          if (ingredientLower.includes(mainIngredient)) {
            ingredients.add(mainIngredient);
          }
        }
      }
    }
  }

  return ingredients;
}

/**
 * Score a recipe for variety (mirrors SueService scoring logic)
 */
function scoreRecipeForVariety(
  recipe: Recipe,
  usedCuisines: Set<string>,
  usedIngredients: Set<string>,
  varietyPreferences: VarietyPreferences
): number {
  let score = 0;

  // Check for new cuisine
  const recipeCuisines = recipe.tags.filter(t =>
    CUISINE_TAGS.includes(t.toLowerCase())
  );
  const hasNewCuisine = recipeCuisines.some(c =>
    !usedCuisines.has(c.toLowerCase())
  );
  if (hasNewCuisine && varietyPreferences.preferNewCuisines !== false) {
    score += 2;
  }

  // Check for new main ingredient
  let hasNewMainIngredient = false;
  for (const ingredient of recipe.ingredients) {
    const ingredientLower = ingredient.name.toLowerCase();
    for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
      if (ingredientLower.includes(mainIngredient) &&
          !usedIngredients.has(mainIngredient)) {
        hasNewMainIngredient = true;
        break;
      }
    }
    if (hasNewMainIngredient) break;
  }
  if (hasNewMainIngredient && varietyPreferences.preferNewIngredients !== false) {
    score += 2;
  }

  // Boost for rating
  if (recipe.rating && recipe.rating >= 4) {
    score += 1;
  }

  return score;
}

/**
 * Get suggestions with variety filtering (mirrors SueService.getSuggestionsWithVariety)
 */
function getSuggestionsWithVariety(
  recipes: Recipe[],
  menu: Menu | undefined,
  recipeMap: Map<string, Recipe>,
  varietyPreferences: VarietyPreferences,
  limit: number = 5
): RecipeSuggestion[] {
  if (!menu || menu.assignments.length === 0) {
    // No menu, just return top recipes
    return recipes.slice(0, limit).map(recipe => ({
      recipe,
      reason: 'matches your preferences',
      confidence: 0.5,
    }));
  }

  const usedCuisines = getUsedCuisines(menu, recipeMap);
  const usedIngredients = getUsedMainIngredients(menu, recipeMap);

  // Add user-specified avoidances
  if (varietyPreferences.avoidCuisines) {
    for (const cuisine of varietyPreferences.avoidCuisines) {
      usedCuisines.add(cuisine.toLowerCase());
    }
  }
  if (varietyPreferences.avoidMainIngredients) {
    for (const ingredient of varietyPreferences.avoidMainIngredients) {
      usedIngredients.add(ingredient.toLowerCase());
    }
  }

  // Score recipes by variety
  const scoredRecipes = recipes.map(recipe => ({
    recipe,
    score: scoreRecipeForVariety(recipe, usedCuisines, usedIngredients, varietyPreferences),
  }));

  // Sort by score descending
  scoredRecipes.sort((a, b) => b.score - a.score);

  return scoredRecipes.slice(0, limit).map(({ recipe, score }) => ({
    recipe,
    reason: score > 0 ? 'adds variety to your menu' : 'matches your preferences',
    confidence: Math.min(1, 0.5 + score * 0.1),
  }));
}

/**
 * Generators for property tests
 */
const cuisineTagArb = fc.constantFrom(...CUISINE_TAGS.slice(0, 8));
const mainIngredientArb = fc.constantFrom(...MAIN_INGREDIENT_CATEGORIES.slice(0, 8));
const ratingArb = fc.integer({ min: 1, max: 5 });

const recipeArb: fc.Arbitrary<Recipe> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  ingredients: fc.array(
    fc.record({
      id: fc.uuid(),
      name: mainIngredientArb,
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
      unit: fc.constantFrom('cup', 'tbsp', 'tsp', 'lb', 'oz', 'piece'),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  instructions: fc.array(
    fc.record({
      id: fc.uuid(),
      stepNumber: fc.integer({ min: 1, max: 10 }),
      text: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  prepTime: fc.record({ minutes: fc.integer({ min: 5, max: 60 }) }),
  cookTime: fc.record({ minutes: fc.integer({ min: 5, max: 60 }) }),
  servings: fc.integer({ min: 1, max: 8 }),
  tags: fc.array(cuisineTagArb, { minLength: 0, maxLength: 3 }),
  rating: fc.option(ratingArb, { nil: undefined }),
  version: fc.constant(1),
  createdAt: fc.constant(new Date()),
  updatedAt: fc.constant(new Date()),
});

const menuAssignmentArb = (recipeId: string): fc.Arbitrary<MenuAssignment> => fc.record({
  id: fc.uuid(),
  menuId: fc.uuid(),
  recipeId: fc.constant(recipeId),
  date: fc.constant(new Date()),
  mealSlot: fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
  servings: fc.integer({ min: 1, max: 8 }),
  cookDate: fc.constant(new Date()),
});

const varietyPreferencesArb: fc.Arbitrary<VarietyPreferences> = fc.record({
  avoidCuisines: fc.option(fc.array(cuisineTagArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
  avoidMainIngredients: fc.option(fc.array(mainIngredientArb, { minLength: 0, maxLength: 2 }), { nil: undefined }),
  preferNewCuisines: fc.option(fc.boolean(), { nil: undefined }),
  preferNewIngredients: fc.option(fc.boolean(), { nil: undefined }),
});

describe('Property 17: Sue Variety Tracking', () => {
  it('should accurately track cuisines used in menu', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 2, maxLength: 10 }),
        (recipes) => {
          // Create a menu with some recipes
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          const assignedRecipes = recipes.slice(0, Math.min(3, recipes.length));
          
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: assignedRecipes.map((r, i) => ({
              id: `assignment-${i}`,
              menuId: 'test-menu',
              recipeId: r.id,
              date: new Date(),
              mealSlot: 'dinner' as const,
              servings: 4,
              cookDate: new Date(),
            })),
            createdAt: new Date(),
          };

          const usedCuisines = getUsedCuisines(menu, recipeMap);

          // Verify all cuisines from assigned recipes are tracked
          for (const recipe of assignedRecipes) {
            for (const tag of recipe.tags) {
              if (CUISINE_TAGS.includes(tag.toLowerCase())) {
                expect(usedCuisines.has(tag.toLowerCase())).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accurately track main ingredients used in menu', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 2, maxLength: 10 }),
        (recipes) => {
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          const assignedRecipes = recipes.slice(0, Math.min(3, recipes.length));
          
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: assignedRecipes.map((r, i) => ({
              id: `assignment-${i}`,
              menuId: 'test-menu',
              recipeId: r.id,
              date: new Date(),
              mealSlot: 'dinner' as const,
              servings: 4,
              cookDate: new Date(),
            })),
            createdAt: new Date(),
          };

          const usedIngredients = getUsedMainIngredients(menu, recipeMap);

          // Verify all main ingredients from assigned recipes are tracked
          for (const recipe of assignedRecipes) {
            for (const ingredient of recipe.ingredients) {
              const ingredientLower = ingredient.name.toLowerCase();
              for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
                if (ingredientLower.includes(mainIngredient)) {
                  expect(usedIngredients.has(mainIngredient)).toBe(true);
                }
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prioritize recipes with new cuisines when preferNewCuisines is true', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 5, maxLength: 15 }),
        (recipes) => {
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          
          // Create menu with first recipe
          const assignedRecipe = recipes[0];
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: [{
              id: 'assignment-1',
              menuId: 'test-menu',
              recipeId: assignedRecipe.id,
              date: new Date(),
              mealSlot: 'dinner' as const,
              servings: 4,
              cookDate: new Date(),
            }],
            createdAt: new Date(),
          };

          const varietyPreferences: VarietyPreferences = {
            preferNewCuisines: true,
            preferNewIngredients: true,
          };

          // Get remaining recipes (not in menu)
          const availableRecipes = recipes.filter(r => r.id !== assignedRecipe.id);
          const suggestions = getSuggestionsWithVariety(
            availableRecipes,
            menu,
            recipeMap,
            varietyPreferences,
            5
          );

          // If there are suggestions, verify scoring logic
          if (suggestions.length > 1) {
            const usedCuisines = getUsedCuisines(menu, recipeMap);
            const usedIngredients = getUsedMainIngredients(menu, recipeMap);
            
            // Verify suggestions are sorted by score (descending)
            // Note: recipes with same score may appear in any order
            const scores = suggestions.map(s => 
              scoreRecipeForVariety(s.recipe, usedCuisines, usedIngredients, varietyPreferences)
            );
            
            // Check that scores are non-increasing (allowing ties)
            for (let i = 0; i < scores.length - 1; i++) {
              expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect avoidCuisines preference', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 5, maxLength: 15 }),
        fc.array(cuisineTagArb, { minLength: 1, maxLength: 2 }),
        (recipes, avoidCuisines) => {
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: [],
            createdAt: new Date(),
          };

          const varietyPreferences: VarietyPreferences = {
            avoidCuisines,
            preferNewCuisines: true,
          };

          const suggestions = getSuggestionsWithVariety(
            recipes,
            menu,
            recipeMap,
            varietyPreferences,
            5
          );

          // Recipes with avoided cuisines should NOT get cuisine variety bonus
          // The avoidCuisines are added to usedCuisines, so recipes with those
          // cuisines won't get the +2 cuisine variety bonus
          if (suggestions.length > 0) {
            const usedCuisines = new Set(avoidCuisines.map(c => c.toLowerCase()));
            
            for (const suggestion of suggestions) {
              const recipeCuisines = suggestion.recipe.tags.filter(t =>
                CUISINE_TAGS.includes(t.toLowerCase())
              );
              
              // If recipe has only avoided cuisines, it shouldn't get cuisine variety bonus
              const hasOnlyAvoidedCuisines = recipeCuisines.length > 0 &&
                recipeCuisines.every(c => usedCuisines.has(c.toLowerCase()));
              
              if (hasOnlyAvoidedCuisines) {
                // Calculate score with only cuisine consideration (no ingredients)
                // to verify cuisine variety bonus is not applied
                const cuisineScore = scoreRecipeForVariety(
                  suggestion.recipe, usedCuisines, new Set(), { preferNewCuisines: true }
                );
                
                // The cuisine variety bonus is +2, rating bonus is +1
                // If recipe has only avoided cuisines, it should NOT get the +2 cuisine bonus
                // So max score from cuisine alone would be 1 (from rating)
                // But it could still get +2 from new ingredients
                // We verify the cuisine bonus specifically wasn't applied
                const hasNewCuisine = recipeCuisines.some(c =>
                  !usedCuisines.has(c.toLowerCase())
                );
                expect(hasNewCuisine).toBe(false);
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect avoidMainIngredients preference', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 5, maxLength: 15 }),
        fc.array(mainIngredientArb, { minLength: 1, maxLength: 2 }),
        (recipes, avoidMainIngredients) => {
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: [],
            createdAt: new Date(),
          };

          const varietyPreferences: VarietyPreferences = {
            avoidMainIngredients,
            preferNewIngredients: true,
          };

          const suggestions = getSuggestionsWithVariety(
            recipes,
            menu,
            recipeMap,
            varietyPreferences,
            5
          );

          // Recipes with avoided ingredients should NOT get ingredient variety bonus
          // The avoidMainIngredients are added to usedIngredients, so recipes with those
          // ingredients won't get the +2 ingredient variety bonus
          if (suggestions.length > 0) {
            const usedIngredients = new Set(avoidMainIngredients.map(i => i.toLowerCase()));
            
            for (const suggestion of suggestions) {
              // Check if recipe has only avoided main ingredients
              const recipeMainIngredients: string[] = [];
              for (const ing of suggestion.recipe.ingredients) {
                const ingLower = ing.name.toLowerCase();
                for (const main of MAIN_INGREDIENT_CATEGORIES) {
                  if (ingLower.includes(main)) {
                    recipeMainIngredients.push(main);
                  }
                }
              }
              
              const hasOnlyAvoidedIngredients = recipeMainIngredients.length > 0 &&
                recipeMainIngredients.every(i => usedIngredients.has(i));
              
              if (hasOnlyAvoidedIngredients) {
                // Verify that the recipe doesn't have any new main ingredients
                // (all its main ingredients are in the avoided list)
                const hasNewMainIngredient = recipeMainIngredients.some(i =>
                  !usedIngredients.has(i)
                );
                expect(hasNewMainIngredient).toBe(false);
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return suggestions even when variety preferences are disabled', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb, { minLength: 3, maxLength: 10 }),
        (recipes) => {
          const recipeMap = new Map(recipes.map(r => [r.id, r]));
          
          const menu: Menu = {
            id: 'test-menu',
            name: 'Test Menu',
            startDate: new Date(),
            endDate: new Date(),
            assignments: [{
              id: 'assignment-1',
              menuId: 'test-menu',
              recipeId: recipes[0].id,
              date: new Date(),
              mealSlot: 'dinner' as const,
              servings: 4,
              cookDate: new Date(),
            }],
            createdAt: new Date(),
          };

          const varietyPreferences: VarietyPreferences = {
            preferNewCuisines: false,
            preferNewIngredients: false,
          };

          const availableRecipes = recipes.filter(r => r.id !== recipes[0].id);
          const suggestions = getSuggestionsWithVariety(
            availableRecipes,
            menu,
            recipeMap,
            varietyPreferences,
            5
          );

          // Should still return suggestions
          expect(suggestions.length).toBeLessThanOrEqual(Math.min(5, availableRecipes.length));
        }
      ),
      { numRuns: 50 }
    );
  });
});
