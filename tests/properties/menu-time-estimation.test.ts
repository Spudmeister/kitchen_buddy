/**
 * Property Test: Menu Time Estimation Fallback
 * 
 * **Feature: sous-chef, Property 23: Menu Time Estimation Fallback**
 * **Validates: Requirements 12.5**
 * 
 * For any recipe in a menu, the time estimate SHALL use the statistical average
 * if cook sessions exist, otherwise SHALL use the recipe's stated estimate.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { MenuService } from '../../src/services/menu-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, menuInputArb, mealSlotArb, cookSessionWithTimesArb } from '../generators/recipe-generators.js';

describe('Property 23: Menu Time Estimation Fallback', () => {
  let db: Database;
  let recipeService: RecipeService;
  let menuService: MenuService;
  let statsService: StatisticsService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    menuService = new MenuService(db);
    statsService = new StatisticsService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should use recipe estimates when no cook sessions exist', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        (recipeInput) => {
          // Create a recipe with specific prep and cook times
          const recipe = recipeService.createRecipe(recipeInput);

          // Get time estimate (no cook sessions)
          const estimate = menuService.getRecipeTimeEstimate(recipe.id);

          // Should use recipe estimates
          expect(estimate).toBeDefined();
          expect(estimate!.source).toBe('recipe');
          expect(estimate!.prepTime.minutes).toBe(recipeInput.prepTimeMinutes);
          expect(estimate!.cookTime.minutes).toBe(recipeInput.cookTimeMinutes);
          expect(estimate!.totalTime.minutes).toBe(recipeInput.prepTimeMinutes + recipeInput.cookTimeMinutes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use statistical averages when cook sessions exist', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(
          fc.record({
            actualPrepMinutes: fc.integer({ min: 1, max: 120 }),
            actualCookMinutes: fc.integer({ min: 1, max: 120 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (recipeInput, sessionTimes) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Log cook sessions with actual times
          for (const times of sessionTimes) {
            statsService.logCookSession({
              recipeId: recipe.id,
              date: new Date(),
              actualPrepMinutes: times.actualPrepMinutes,
              actualCookMinutes: times.actualCookMinutes,
              servingsMade: 4,
            });
          }

          // Calculate expected averages
          const expectedAvgPrep = Math.round(
            sessionTimes.reduce((sum, t) => sum + t.actualPrepMinutes, 0) / sessionTimes.length
          );
          const expectedAvgCook = Math.round(
            sessionTimes.reduce((sum, t) => sum + t.actualCookMinutes, 0) / sessionTimes.length
          );

          // Get time estimate
          const estimate = menuService.getRecipeTimeEstimate(recipe.id);

          // Should use statistical averages
          expect(estimate).toBeDefined();
          expect(estimate!.source).toBe('statistical');
          expect(estimate!.prepTime.minutes).toBe(expectedAvgPrep);
          expect(estimate!.cookTime.minutes).toBe(expectedAvgCook);
          expect(estimate!.totalTime.minutes).toBe(expectedAvgPrep + expectedAvgCook);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return undefined for non-existent recipes', () => {
    const estimate = menuService.getRecipeTimeEstimate('non-existent-id');
    expect(estimate).toBeUndefined();
  });

  it('should calculate menu time estimates correctly', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 3 }),
        menuInputArb,
        mealSlotArb,
        (recipeInputs, menuInput, mealSlot) => {
          // Create recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Create a menu
          const menu = menuService.createMenu(menuInput);

          // Assign recipes to the menu using the menu's start date (guaranteed to be in range)
          for (const recipe of recipes) {
            menuService.assignRecipe(menu.id, {
              recipeId: recipe.id,
              date: menu.startDate,
              mealSlot,
            });
          }

          // Get menu time estimate
          const menuEstimate = menuService.getMenuTimeEstimate(menu.id);

          // Should have estimates for all recipes
          expect(menuEstimate).toBeDefined();
          expect(menuEstimate!.recipeEstimates.length).toBe(recipes.length);

          // Calculate expected totals
          const expectedTotalPrep = recipeInputs.reduce((sum, r) => sum + r.prepTimeMinutes, 0);
          const expectedTotalCook = recipeInputs.reduce((sum, r) => sum + r.cookTimeMinutes, 0);

          expect(menuEstimate!.totalPrepTime.minutes).toBe(expectedTotalPrep);
          expect(menuEstimate!.totalCookTime.minutes).toBe(expectedTotalCook);
          expect(menuEstimate!.totalTime.minutes).toBe(expectedTotalPrep + expectedTotalCook);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle mixed statistical and recipe estimates in menu', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        fc.integer({ min: 10, max: 60 }),
        fc.integer({ min: 10, max: 60 }),
        menuInputArb,
        mealSlotArb,
        (recipeInput1, recipeInput2, actualPrep, actualCook, menuInput, mealSlot) => {
          // Create two recipes
          const recipe1 = recipeService.createRecipe(recipeInput1);
          const recipe2 = recipeService.createRecipe(recipeInput2);

          // Log cook session only for recipe1
          statsService.logCookSession({
            recipeId: recipe1.id,
            date: new Date(),
            actualPrepMinutes: actualPrep,
            actualCookMinutes: actualCook,
            servingsMade: 4,
          });

          // Create a menu with both recipes
          const menu = menuService.createMenu(menuInput);
          menuService.assignRecipe(menu.id, {
            recipeId: recipe1.id,
            date: menu.startDate,
            mealSlot,
          });
          menuService.assignRecipe(menu.id, {
            recipeId: recipe2.id,
            date: menu.startDate,
            mealSlot: 'snack',
          });

          // Get menu time estimate
          const menuEstimate = menuService.getMenuTimeEstimate(menu.id);

          expect(menuEstimate).toBeDefined();
          expect(menuEstimate!.recipeEstimates.length).toBe(2);

          // Find estimates for each recipe
          const estimate1 = menuEstimate!.recipeEstimates.find(e => e.recipeId === recipe1.id);
          const estimate2 = menuEstimate!.recipeEstimates.find(e => e.recipeId === recipe2.id);

          // Recipe1 should use statistical (has cook session)
          expect(estimate1).toBeDefined();
          expect(estimate1!.source).toBe('statistical');
          expect(estimate1!.prepTime.minutes).toBe(actualPrep);
          expect(estimate1!.cookTime.minutes).toBe(actualCook);

          // Recipe2 should use recipe estimates (no cook session)
          expect(estimate2).toBeDefined();
          expect(estimate2!.source).toBe('recipe');
          expect(estimate2!.prepTime.minutes).toBe(recipeInput2.prepTimeMinutes);
          expect(estimate2!.cookTime.minutes).toBe(recipeInput2.cookTimeMinutes);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return undefined for non-existent menu', () => {
    const estimate = menuService.getMenuTimeEstimate('non-existent-menu');
    expect(estimate).toBeUndefined();
  });

  it('should handle empty menu (no assignments)', () => {
    fc.assert(
      fc.property(menuInputArb, (menuInput) => {
        // Create an empty menu
        const menu = menuService.createMenu(menuInput);

        // Get menu time estimate
        const menuEstimate = menuService.getMenuTimeEstimate(menu.id);

        expect(menuEstimate).toBeDefined();
        expect(menuEstimate!.recipeEstimates.length).toBe(0);
        expect(menuEstimate!.totalPrepTime.minutes).toBe(0);
        expect(menuEstimate!.totalCookTime.minutes).toBe(0);
        expect(menuEstimate!.totalTime.minutes).toBe(0);
      }),
      { numRuns: 30 }
    );
  });

  it('should count unique recipes only once in menu estimate', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuInputArb,
        (recipeInput, menuInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create a menu
          const menu = menuService.createMenu(menuInput);

          // Assign the same recipe multiple times using menu's start date
          menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: menu.startDate,
            mealSlot: 'breakfast',
          });
          menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: menu.startDate,
            mealSlot: 'lunch',
          });
          menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: menu.startDate,
            mealSlot: 'dinner',
          });

          // Get menu time estimate
          const menuEstimate = menuService.getMenuTimeEstimate(menu.id);

          // Should only count the recipe once
          expect(menuEstimate).toBeDefined();
          expect(menuEstimate!.recipeEstimates.length).toBe(1);
          expect(menuEstimate!.totalPrepTime.minutes).toBe(recipeInput.prepTimeMinutes);
          expect(menuEstimate!.totalCookTime.minutes).toBe(recipeInput.cookTimeMinutes);
        }
      ),
      { numRuns: 30 }
    );
  });
});
