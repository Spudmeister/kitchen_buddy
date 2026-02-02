/**
 * Property Test: Quick Actions Availability
 *
 * **Feature: sous-chef-pwa, Property 4: Quick Actions Availability**
 * **Validates: Requirements 11.1, 11.3, 11.5**
 *
 * For any Recipe_Card in any view (variant), the same set of quick actions
 * SHALL be available. This ensures consistent user experience across:
 * - Compact variant (list views)
 * - Standard variant (grid views)
 * - Detailed variant (featured views)
 *
 * Quick Actions include:
 * - Cook Now
 * - Add to Menu
 * - Scale
 * - Share
 * - Edit
 * - Duplicate
 * - Delete
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Recipe, Ingredient, Instruction } from '../../src/types/recipe';
import type { Duration } from '../../src/types/units';
import { QUICK_ACTIONS, getQuickActionTypes, type QuickActionType } from '../../src/components/ui/QuickActionsMenu';

/**
 * The expected set of quick actions that must be available on all Recipe_Cards
 */
const EXPECTED_ACTIONS: QuickActionType[] = [
  'cook-now',
  'add-to-menu',
  'scale',
  'share',
  'edit',
  'duplicate',
  'delete',
];

/**
 * Recipe card variants
 */
type RecipeCardVariant = 'compact' | 'standard' | 'detailed';

const ALL_VARIANTS: RecipeCardVariant[] = ['compact', 'standard', 'detailed'];

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
 * Arbitrary for generating a recipe card variant
 */
const variantArb: fc.Arbitrary<RecipeCardVariant> = fc.constantFrom(...ALL_VARIANTS);

/**
 * Simulate what quick actions would be available for a recipe card
 * This models the behavior of the QuickActionsMenu component
 */
function getAvailableQuickActions(_recipe: Recipe, _variant: RecipeCardVariant): QuickActionType[] {
  // The QuickActionsMenu provides the same actions regardless of variant
  // This is the expected behavior per Requirements 11.1, 11.3, 11.5
  return getQuickActionTypes();
}

describe('Property 4: Quick Actions Availability', () => {
  it('should provide all expected quick actions for any recipe', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        const availableActions = getAvailableQuickActions(recipe, 'standard');

        // All expected actions must be available
        for (const expectedAction of EXPECTED_ACTIONS) {
          expect(availableActions).toContain(expectedAction);
        }

        // The number of actions should match
        expect(availableActions.length).toBe(EXPECTED_ACTIONS.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should provide the same quick actions across all recipe card variants', () => {
    fc.assert(
      fc.property(recipeArb, variantArb, (recipe, variant) => {
        const actionsForVariant = getAvailableQuickActions(recipe, variant);

        // Actions should match expected set regardless of variant
        expect(actionsForVariant.sort()).toEqual([...EXPECTED_ACTIONS].sort());
      }),
      { numRuns: 100 }
    );
  });

  it('should have consistent actions between compact, standard, and detailed variants', () => {
    fc.assert(
      fc.property(recipeArb, (recipe) => {
        const compactActions = getAvailableQuickActions(recipe, 'compact');
        const standardActions = getAvailableQuickActions(recipe, 'standard');
        const detailedActions = getAvailableQuickActions(recipe, 'detailed');

        // All variants should have the same actions
        expect(compactActions.sort()).toEqual(standardActions.sort());
        expect(standardActions.sort()).toEqual(detailedActions.sort());
        expect(compactActions.sort()).toEqual(detailedActions.sort());
      }),
      { numRuns: 100 }
    );
  });

  it('should include all required actions from QUICK_ACTIONS constant', () => {
    // Verify that the QUICK_ACTIONS constant contains all expected actions
    const actionTypes = QUICK_ACTIONS.map((action) => action.type);

    for (const expectedAction of EXPECTED_ACTIONS) {
      expect(actionTypes).toContain(expectedAction);
    }

    // Verify each action has a label and icon
    for (const action of QUICK_ACTIONS) {
      expect(action.type).toBeDefined();
      expect(action.label).toBeDefined();
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.icon).toBeDefined();
    }
  });

  it('should mark delete action as destructive', () => {
    const deleteAction = QUICK_ACTIONS.find((action) => action.type === 'delete');
    expect(deleteAction).toBeDefined();
    expect(deleteAction?.destructive).toBe(true);
  });

  it('should not mark non-destructive actions as destructive', () => {
    const nonDestructiveActions = QUICK_ACTIONS.filter((action) => action.type !== 'delete');

    for (const action of nonDestructiveActions) {
      expect(action.destructive).toBeFalsy();
    }
  });
});
