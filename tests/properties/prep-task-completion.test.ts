/**
 * Property Test: Prep Task Completion State
 *
 * **Feature: sous-chef, Property 16: Prep Task Completion State**
 * **Validates: Requirements 6.4**
 *
 * For any prep task, marking it complete SHALL update its state and SHALL
 * not affect other tasks' completion states.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MealPrepService } from '../../src/services/meal-prep-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import { unitArb } from '../generators/recipe-generators.js';

describe('Property 16: Prep Task Completion State', () => {
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

  it('should mark task as complete when completeTask is called', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity) => {
          // Create a recipe
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe.id],
          });

          // All tasks should start as not completed
          for (const task of plan.tasks) {
            expect(task.completed).toBe(false);
          }

          // Complete the first task
          const firstTask = plan.tasks[0]!;
          const updatedTask = mealPrepService.completeTask(plan.id, firstTask.id);

          // The returned task should be marked as complete
          expect(updatedTask.completed).toBe(true);
          expect(updatedTask.id).toBe(firstTask.id);

          // Verify by fetching the plan again
          const refreshedPlan = mealPrepService.getMealPrepPlan(plan.id)!;
          const refreshedTask = refreshedPlan.tasks.find((t) => t.id === firstTask.id)!;
          expect(refreshedTask.completed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should mark task as incomplete when uncompleteTask is called', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity) => {
          // Create a recipe
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe.id],
          });

          // Complete the first task
          const firstTask = plan.tasks[0]!;
          mealPrepService.completeTask(plan.id, firstTask.id);

          // Uncomplete the task
          const updatedTask = mealPrepService.uncompleteTask(plan.id, firstTask.id);

          // The returned task should be marked as not complete
          expect(updatedTask.completed).toBe(false);
          expect(updatedTask.id).toBe(firstTask.id);

          // Verify by fetching the plan again
          const refreshedPlan = mealPrepService.getMealPrepPlan(plan.id)!;
          const refreshedTask = refreshedPlan.tasks.find((t) => t.id === firstTask.id)!;
          expect(refreshedTask.completed).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not affect other tasks when completing one task', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName1, ingredientName2, unit, quantity) => {
          // Create a recipe with multiple ingredients (to get multiple tasks)
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [
              { name: ingredientName1, quantity, unit },
              { name: ingredientName2 + '_different', quantity, unit },
            ],
            instructions: [{ text: 'Step 1' }, { text: 'Step 2' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe.id],
          });

          // Should have multiple tasks
          expect(plan.tasks.length).toBeGreaterThan(1);

          // Record initial completion states
          const initialStates = new Map(plan.tasks.map((t) => [t.id, t.completed]));

          // Complete only the first task
          const firstTask = plan.tasks[0]!;
          mealPrepService.completeTask(plan.id, firstTask.id);

          // Fetch the updated plan
          const refreshedPlan = mealPrepService.getMealPrepPlan(plan.id)!;

          // Verify only the first task changed
          for (const task of refreshedPlan.tasks) {
            if (task.id === firstTask.id) {
              expect(task.completed).toBe(true);
            } else {
              // Other tasks should remain unchanged
              expect(task.completed).toBe(initialStates.get(task.id));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve task completion state across plan retrieval', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (ingredientName, unit, quantity, completionPattern) => {
          // Create a recipe with multiple instructions to get multiple tasks
          const instructions = completionPattern.map((_, i) => ({ text: 'Step ' + (i + 1) }));
          
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions,
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate meal prep plan
          const plan = mealPrepService.generateMealPrepPlan({
            recipeIds: [recipe.id],
          });

          // Apply completion pattern to tasks (up to the number of tasks we have)
          const tasksToComplete = plan.tasks.slice(0, completionPattern.length);
          for (let i = 0; i < tasksToComplete.length; i++) {
            if (completionPattern[i]) {
              mealPrepService.completeTask(plan.id, tasksToComplete[i]!.id);
            }
          }

          // Fetch the plan again
          const refreshedPlan = mealPrepService.getMealPrepPlan(plan.id)!;

          // Verify completion states match the pattern
          for (let i = 0; i < tasksToComplete.length; i++) {
            const task = refreshedPlan.tasks.find((t) => t.id === tasksToComplete[i]!.id)!;
            expect(task.completed).toBe(completionPattern[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
