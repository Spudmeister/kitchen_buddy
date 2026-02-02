/**
 * Property Test: Unit Preference Consistency
 * 
 * **Feature: sous-chef, Property 6: Unit Preference Consistency**
 * **Validates: Requirements 2.3, 10.1**
 * 
 * For any recipe and any unit system preference (US or metric), all displayed
 * measurements SHALL be in the preferred unit system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { PreferencesService } from '../../src/services/preferences-service.js';
import { UnitConverter } from '../../src/services/unit-converter.js';
import { minimalRecipeInputArb, unitSystemArb } from '../generators/recipe-generators.js';
import { isUSUnit, isMetricUnit, getUnitSystem } from '../../src/types/units.js';
import type { UnitSystem, Unit } from '../../src/types/units.js';
import type { Recipe, Ingredient } from '../../src/types/recipe.js';

/**
 * Check if a unit is convertible (volume or weight)
 */
function isConvertibleUnit(unit: Unit): boolean {
  return isUSUnit(unit) || isMetricUnit(unit);
}

/**
 * Check if an ingredient's unit matches the target system
 * Non-convertible units (piece, dozen, pinch, dash, to_taste) are always considered matching
 */
function ingredientMatchesSystem(ingredient: Ingredient, targetSystem: UnitSystem): boolean {
  const unitSystem = getUnitSystem(ingredient.unit);
  
  // Non-convertible units are always acceptable
  if (unitSystem === null) {
    return true;
  }
  
  // Convertible units must match the target system
  return unitSystem === targetSystem;
}

/**
 * Convert a recipe to the target unit system
 */
function convertRecipeToSystem(recipe: Recipe, targetSystem: UnitSystem, converter: UnitConverter): Recipe {
  const convertedIngredients = recipe.ingredients.map(ing => 
    converter.convertToSystem(ing, targetSystem)
  );
  
  return {
    ...recipe,
    ingredients: convertedIngredients,
  };
}

describe('Property 6: Unit Preference Consistency', () => {
  let db: Database;
  let recipeService: RecipeService;
  let preferencesService: PreferencesService;
  let unitConverter: UnitConverter;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    preferencesService = new PreferencesService(db);
    unitConverter = new UnitConverter();
  });

  afterEach(() => {
    db.close();
  });

  it('should convert all convertible ingredients to the preferred unit system', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        unitSystemArb,
        (recipeInput, preferredSystem) => {
          // Set the unit system preference
          preferencesService.setDefaultUnitSystem(preferredSystem);

          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Convert recipe to preferred system
          const convertedRecipe = convertRecipeToSystem(recipe, preferredSystem, unitConverter);

          // Verify all convertible ingredients are in the preferred system
          for (const ingredient of convertedRecipe.ingredients) {
            expect(ingredientMatchesSystem(ingredient, preferredSystem)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve non-convertible units regardless of preference', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        unitSystemArb,
        (recipeInput, preferredSystem) => {
          // Set the unit system preference
          preferencesService.setDefaultUnitSystem(preferredSystem);

          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Convert recipe to preferred system
          const convertedRecipe = convertRecipeToSystem(recipe, preferredSystem, unitConverter);

          // Non-convertible units should remain unchanged
          for (let i = 0; i < recipe.ingredients.length; i++) {
            const original = recipe.ingredients[i]!;
            const converted = convertedRecipe.ingredients[i]!;
            
            if (!isConvertibleUnit(original.unit)) {
              // Non-convertible units should be unchanged
              expect(converted.unit).toBe(original.unit);
              expect(converted.quantity).toBe(original.quantity);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain ingredient names and notes after conversion', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        unitSystemArb,
        (recipeInput, preferredSystem) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Convert recipe to preferred system
          const convertedRecipe = convertRecipeToSystem(recipe, preferredSystem, unitConverter);

          // Names and notes should be preserved
          for (let i = 0; i < recipe.ingredients.length; i++) {
            const original = recipe.ingredients[i]!;
            const converted = convertedRecipe.ingredients[i]!;
            
            expect(converted.name).toBe(original.name);
            expect(converted.notes).toBe(original.notes);
            expect(converted.category).toBe(original.category);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify US units as US system', () => {
    const usUnits: Unit[] = ['tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart', 'gallon', 'oz', 'lb'];
    
    for (const unit of usUnits) {
      expect(isUSUnit(unit)).toBe(true);
      expect(getUnitSystem(unit)).toBe('us');
    }
  });

  it('should correctly identify metric units as metric system', () => {
    const metricUnits: Unit[] = ['ml', 'l', 'g', 'kg'];
    
    for (const unit of metricUnits) {
      expect(isMetricUnit(unit)).toBe(true);
      expect(getUnitSystem(unit)).toBe('metric');
    }
  });

  it('should correctly identify non-convertible units', () => {
    const nonConvertibleUnits: Unit[] = ['piece', 'dozen', 'pinch', 'dash', 'to_taste'];
    
    for (const unit of nonConvertibleUnits) {
      expect(isUSUnit(unit)).toBe(false);
      expect(isMetricUnit(unit)).toBe(false);
      expect(getUnitSystem(unit)).toBeNull();
    }
  });

  it('should apply preference consistently across multiple recipes', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        unitSystemArb,
        (recipeInputs, preferredSystem) => {
          // Set the unit system preference
          preferencesService.setDefaultUnitSystem(preferredSystem);

          // Create multiple recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Convert all recipes to preferred system
          const convertedRecipes = recipes.map(recipe => 
            convertRecipeToSystem(recipe, preferredSystem, unitConverter)
          );

          // All convertible ingredients in all recipes should be in the preferred system
          for (const recipe of convertedRecipes) {
            for (const ingredient of recipe.ingredients) {
              expect(ingredientMatchesSystem(ingredient, preferredSystem)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle switching between unit systems', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        (recipeInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Convert to US
          preferencesService.setDefaultUnitSystem('us');
          const usRecipe = convertRecipeToSystem(recipe, 'us', unitConverter);
          
          // All convertible ingredients should be in US
          for (const ingredient of usRecipe.ingredients) {
            expect(ingredientMatchesSystem(ingredient, 'us')).toBe(true);
          }

          // Convert to metric
          preferencesService.setDefaultUnitSystem('metric');
          const metricRecipe = convertRecipeToSystem(recipe, 'metric', unitConverter);
          
          // All convertible ingredients should be in metric
          for (const ingredient of metricRecipe.ingredients) {
            expect(ingredientMatchesSystem(ingredient, 'metric')).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve the preference after setting', () => {
    fc.assert(
      fc.property(unitSystemArb, (preferredSystem) => {
        // Set the preference
        preferencesService.setDefaultUnitSystem(preferredSystem);

        // Verify it's stored correctly
        const storedPreference = preferencesService.getDefaultUnitSystem();
        expect(storedPreference).toBe(preferredSystem);

        // Verify through getPreferences
        const allPrefs = preferencesService.getPreferences();
        expect(allPrefs.defaultUnitSystem).toBe(preferredSystem);
      }),
      { numRuns: 100 }
    );
  });
});
