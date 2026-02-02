/**
 * Property Test: Meal Prep Ingredient Consolidation
 *
 * **Feature: sous-chef, Property 15: Meal Prep Ingredient Consolidation**
 * **Validates: Requirements 6.1, 6.2**
 *
 * For any set of recipes with overlapping ingredients, meal prep mode SHALL
 * group preparation tasks for those shared ingredients into single tasks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MealPrepService } from '../../src/services/meal-prep-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import { unitArb, categoryArb } from '../generators/recipe-generators.js';
import type { RecipeInput } from '../../src/types/recipe.js';

describe('Property 15: Meal Prep Ingredient Consolidation', () => {
  let db: Database;
  let mealPrepService: MealPrepService;
  let recipeService: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    mealPrepService = new MealPrepService(db, recipeService);
  });

  afterEach(() => {
    db.close();
  });

  it('should group shared ingredients into single prep tasks', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity1, quantity2) => {
          // Create two recipes with the same ingredient
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity: quantity1, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity: quantity2, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe1.id, recipe2.id],
          });

          // Find ingredient prep tasks for the shared ingredient
          const ingredientPrepTasks = plan.tasks.filter(
            (task) =>
              task.taskType === 'ingredient_prep' &&
              task.ingredientName?.toLowerCase().trim() === ingredientName.toLowerCase().trim()
          );

          // Should have exactly ONE prep task for the shared ingredient
          expect(ingredientPrepTasks.length).toBe(1);

          // The task should reference both recipes
          const sharedTask = ingredientPrepTasks[0]!;
          expect(sharedTask.recipeIds).toContain(recipe1.id);
          expect(sharedTask.recipeIds).toContain(recipe2.id);
          expect(sharedTask.recipeIds.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should identify shared ingredients correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity1, quantity2) => {
          // Create two recipes with the same ingredient
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity: quantity1, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity: quantity2, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe1.id, recipe2.id],
          });

          // Should have the shared ingredient in sharedIngredients list
          const sharedIngredient = plan.sharedIngredients.find(
            (s) => s.name.toLowerCase().trim() === ingredientName.toLowerCase().trim()
          );

          expect(sharedIngredient).toBeDefined();
          expect(sharedIngredient!.recipeIds).toContain(recipe1.id);
          expect(sharedIngredient!.recipeIds).toContain(recipe2.id);

          // Total quantity should be the sum
          const expectedTotal = quantity1 + quantity2;
          expect(sharedIngredient!.totalQuantity).toBeCloseTo(expectedTotal, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not consolidate ingredients with different units', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.tuple(unitArb, unitArb).filter(([u1, u2]) => u1 !== u2),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, [unit1, unit2], quantity1, quantity2) => {
          // Create two recipes with same ingredient but different units
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity: quantity1, unit: unit1 }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity: quantity2, unit: unit2 }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe1.id, recipe2.id],
          });

          // Should NOT have this ingredient in sharedIngredients (different units)
          const sharedIngredient = plan.sharedIngredients.find(
            (s) => s.name.toLowerCase().trim() === ingredientName.toLowerCase().trim()
          );

          expect(sharedIngredient).toBeUndefined();

          // Should have two separate prep tasks for the ingredient
          const ingredientPrepTasks = plan.tasks.filter(
            (task) =>
              task.taskType === 'ingredient_prep' &&
              task.ingredientName?.toLowerCase().trim() === ingredientName.toLowerCase().trim()
          );

          expect(ingredientPrepTasks.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all recipes in the plan', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            ingredientName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            quantity: fc.double({ min: 0.1, max: 100, noNaN: true }),
            unit: unitArb,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (recipeData) => {
          // Create recipes
          const recipes = recipeData.map((data, index) =>
            recipeService.createRecipe({
              title: data.title + ' ' + index,
              ingredients: [{ name: data.ingredientName, quantity: data.quantity, unit: data.unit }],
              instructions: [{ text: 'Step 1' }],
              prepTimeMinutes: 10,
              cookTimeMinutes: 20,
              servings: 4,
            })
          );

          const recipeIds = recipes.map((r) => r.id);

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({ recipeIds });

          // Plan should include all recipe IDs
          expect(plan.recipeIds.length).toBe(recipeIds.length);
          for (const recipeId of recipeIds) {
            expect(plan.recipeIds).toContain(recipeId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
