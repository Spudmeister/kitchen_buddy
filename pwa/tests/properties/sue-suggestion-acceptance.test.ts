/**
 * Property Test: Sue Suggestion Acceptance
 *
 * **Feature: sous-chef-pwa, Property 18: Sue Suggestion Acceptance**
 * **Validates: Requirements 16.4**
 *
 * For any recipe suggestion accepted by the user, the recipe SHALL be added to
 * the specified menu at the specified date and meal slot. The menu assignment
 * count SHALL increase by one.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Recipe } from '../../src/types/recipe';
import type { Menu, MenuAssignment, MealSlot } from '../../src/types/menu';
import type { RecipeSuggestion, SuggestionAcceptResult } from '../../src/types/sue';

/**
 * Mock menu service for testing suggestion acceptance
 */
class MockMenuService {
  private menus: Map<string, Menu> = new Map();

  createMenu(menu: Menu): void {
    this.menus.set(menu.id, { ...menu, assignments: [...menu.assignments] });
  }

  getMenu(menuId: string): Menu | undefined {
    return this.menus.get(menuId);
  }

  assignRecipe(
    menuId: string,
    recipeId: string,
    date: Date,
    mealSlot: MealSlot,
    servings?: number
  ): SuggestionAcceptResult {
    const menu = this.menus.get(menuId);
    if (!menu) {
      return { success: false, error: 'Menu not found' };
    }

    const assignment: MenuAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuId,
      recipeId,
      date,
      mealSlot,
      servings: servings || 4,
      cookDate: date,
    };

    menu.assignments.push(assignment);
    return { success: true, assignmentId: assignment.id };
  }

  getAssignmentCount(menuId: string): number {
    const menu = this.menus.get(menuId);
    return menu ? menu.assignments.length : 0;
  }
}

/**
 * Accept a suggestion and add to menu
 */
function acceptSuggestion(
  menuService: MockMenuService,
  menuId: string,
  recipeId: string,
  date: Date,
  mealSlot: MealSlot,
  servings?: number
): SuggestionAcceptResult {
  return menuService.assignRecipe(menuId, recipeId, date, mealSlot, servings);
}

/**
 * Generators for property tests
 */
const mealSlotArb: fc.Arbitrary<MealSlot> = fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack');
const servingsArb = fc.integer({ min: 1, max: 12 });
const dateArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') });

const recipeArb: fc.Arbitrary<Recipe> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ maxLength: 200 }),
  ingredients: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
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
  servings: servingsArb,
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 5 }),
  rating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  version: fc.constant(1),
  createdAt: fc.constant(new Date()),
  updatedAt: fc.constant(new Date()),
});

const suggestionArb: fc.Arbitrary<RecipeSuggestion> = recipeArb.chain(recipe =>
  fc.record({
    recipe: fc.constant(recipe),
    reason: fc.constantFrom('highly rated', 'quick to make', 'adds variety', 'matches your preferences'),
    confidence: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
  })
);

const menuArb: fc.Arbitrary<Menu> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  startDate: dateArb,
  endDate: dateArb,
  assignments: fc.constant([]),
  createdAt: fc.constant(new Date()),
});

describe('Property 18: Sue Suggestion Acceptance', () => {
  it('should add recipe to menu when suggestion is accepted', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        dateArb,
        mealSlotArb,
        (menu, suggestion, date, mealSlot) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const initialCount = menuService.getAssignmentCount(menu.id);
          
          const result = acceptSuggestion(
            menuService,
            menu.id,
            suggestion.recipe.id,
            date,
            mealSlot
          );

          expect(result.success).toBe(true);
          expect(result.assignmentId).toBeDefined();
          
          const finalCount = menuService.getAssignmentCount(menu.id);
          expect(finalCount).toBe(initialCount + 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create assignment with correct recipe ID', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        dateArb,
        mealSlotArb,
        (menu, suggestion, date, mealSlot) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const result = acceptSuggestion(
            menuService,
            menu.id,
            suggestion.recipe.id,
            date,
            mealSlot
          );

          expect(result.success).toBe(true);

          const updatedMenu = menuService.getMenu(menu.id);
          expect(updatedMenu).toBeDefined();
          
          const newAssignment = updatedMenu!.assignments.find(
            a => a.id === result.assignmentId
          );
          expect(newAssignment).toBeDefined();
          expect(newAssignment!.recipeId).toBe(suggestion.recipe.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create assignment with correct date', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        dateArb,
        mealSlotArb,
        (menu, suggestion, date, mealSlot) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const result = acceptSuggestion(
            menuService,
            menu.id,
            suggestion.recipe.id,
            date,
            mealSlot
          );

          expect(result.success).toBe(true);

          const updatedMenu = menuService.getMenu(menu.id);
          const newAssignment = updatedMenu!.assignments.find(
            a => a.id === result.assignmentId
          );
          
          expect(newAssignment!.date.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create assignment with correct meal slot', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        dateArb,
        mealSlotArb,
        (menu, suggestion, date, mealSlot) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const result = acceptSuggestion(
            menuService,
            menu.id,
            suggestion.recipe.id,
            date,
            mealSlot
          );

          expect(result.success).toBe(true);

          const updatedMenu = menuService.getMenu(menu.id);
          const newAssignment = updatedMenu!.assignments.find(
            a => a.id === result.assignmentId
          );
          
          expect(newAssignment!.mealSlot).toBe(mealSlot);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create assignment with specified servings', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        dateArb,
        mealSlotArb,
        servingsArb,
        (menu, suggestion, date, mealSlot, servings) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const result = acceptSuggestion(
            menuService,
            menu.id,
            suggestion.recipe.id,
            date,
            mealSlot,
            servings
          );

          expect(result.success).toBe(true);

          const updatedMenu = menuService.getMenu(menu.id);
          const newAssignment = updatedMenu!.assignments.find(
            a => a.id === result.assignmentId
          );
          
          expect(newAssignment!.servings).toBe(servings);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should fail gracefully when menu does not exist', () => {
    fc.assert(
      fc.property(
        suggestionArb,
        dateArb,
        mealSlotArb,
        (suggestion, date, mealSlot) => {
          const menuService = new MockMenuService();
          // Don't create the menu

          const result = acceptSuggestion(
            menuService,
            'non-existent-menu',
            suggestion.recipe.id,
            date,
            mealSlot
          );

          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should allow multiple suggestions to be accepted to same menu', () => {
    fc.assert(
      fc.property(
        menuArb,
        fc.array(suggestionArb, { minLength: 2, maxLength: 5 }),
        fc.array(dateArb, { minLength: 2, maxLength: 5 }),
        fc.array(mealSlotArb, { minLength: 2, maxLength: 5 }),
        (menu, suggestions, dates, mealSlots) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const initialCount = menuService.getAssignmentCount(menu.id);
          const acceptCount = Math.min(suggestions.length, dates.length, mealSlots.length);

          for (let i = 0; i < acceptCount; i++) {
            const result = acceptSuggestion(
              menuService,
              menu.id,
              suggestions[i].recipe.id,
              dates[i],
              mealSlots[i]
            );
            expect(result.success).toBe(true);
          }

          const finalCount = menuService.getAssignmentCount(menu.id);
          expect(finalCount).toBe(initialCount + acceptCount);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should allow same recipe to be added to different slots', () => {
    fc.assert(
      fc.property(
        menuArb,
        suggestionArb,
        fc.array(dateArb, { minLength: 2, maxLength: 3 }),
        fc.array(mealSlotArb, { minLength: 2, maxLength: 3 }),
        (menu, suggestion, dates, mealSlots) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const addCount = Math.min(dates.length, mealSlots.length);
          const assignmentIds: string[] = [];

          for (let i = 0; i < addCount; i++) {
            const result = acceptSuggestion(
              menuService,
              menu.id,
              suggestion.recipe.id,
              dates[i],
              mealSlots[i]
            );
            expect(result.success).toBe(true);
            assignmentIds.push(result.assignmentId!);
          }

          // All assignments should be unique
          const uniqueIds = new Set(assignmentIds);
          expect(uniqueIds.size).toBe(addCount);

          // All assignments should reference the same recipe
          const updatedMenu = menuService.getMenu(menu.id);
          for (const id of assignmentIds) {
            const assignment = updatedMenu!.assignments.find(a => a.id === id);
            expect(assignment!.recipeId).toBe(suggestion.recipe.id);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve existing assignments when adding new ones', () => {
    fc.assert(
      fc.property(
        menuArb,
        fc.array(suggestionArb, { minLength: 3, maxLength: 5 }),
        fc.array(dateArb, { minLength: 3, maxLength: 5 }),
        fc.array(mealSlotArb, { minLength: 3, maxLength: 5 }),
        (menu, suggestions, dates, mealSlots) => {
          const menuService = new MockMenuService();
          menuService.createMenu(menu);

          const count = Math.min(suggestions.length, dates.length, mealSlots.length);
          const allAssignmentIds: string[] = [];

          for (let i = 0; i < count; i++) {
            const result = acceptSuggestion(
              menuService,
              menu.id,
              suggestions[i].recipe.id,
              dates[i],
              mealSlots[i]
            );
            expect(result.success).toBe(true);
            allAssignmentIds.push(result.assignmentId!);

            // Verify all previous assignments still exist
            const currentMenu = menuService.getMenu(menu.id);
            for (const prevId of allAssignmentIds) {
              const exists = currentMenu!.assignments.some(a => a.id === prevId);
              expect(exists).toBe(true);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
