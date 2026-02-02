/**
 * Shopping List Test Fixtures for Sous Chef
 * 
 * Sample shopping list configurations for testing:
 * - Simple lists
 * - Consolidated lists
 * - Lists with cook-by dates
 * - Edge cases
 * 
 * Requirements: Design - Testing Strategy
 */

import type { IngredientInput, IngredientCategory } from '../../src/types/recipe.js';
import type { Unit } from '../../src/types/units.js';

/**
 * Simple ingredient list (no consolidation needed)
 */
export const simpleIngredients: IngredientInput[] = [
  { name: 'chicken breast', quantity: 1, unit: 'lb', category: 'meat' },
  { name: 'broccoli', quantity: 2, unit: 'cup', category: 'produce' },
  { name: 'rice', quantity: 1, unit: 'cup', category: 'pantry' },
  { name: 'soy sauce', quantity: 2, unit: 'tbsp', category: 'pantry' },
  { name: 'garlic', quantity: 3, unit: 'piece', category: 'produce' },
];

/**
 * Ingredients that should be consolidated (same name, same unit)
 */
export const consolidatableIngredients: IngredientInput[] = [
  { name: 'flour', quantity: 2, unit: 'cup', category: 'pantry' },
  { name: 'flour', quantity: 1.5, unit: 'cup', category: 'pantry' },
  { name: 'sugar', quantity: 0.5, unit: 'cup', category: 'pantry' },
  { name: 'sugar', quantity: 0.25, unit: 'cup', category: 'pantry' },
  { name: 'butter', quantity: 4, unit: 'tbsp', category: 'dairy' },
  { name: 'butter', quantity: 2, unit: 'tbsp', category: 'dairy' },
];

/**
 * Ingredients with same name but different units (should NOT consolidate)
 */
export const differentUnitsIngredients: IngredientInput[] = [
  { name: 'milk', quantity: 1, unit: 'cup', category: 'dairy' },
  { name: 'milk', quantity: 250, unit: 'ml', category: 'dairy' },
  { name: 'cheese', quantity: 100, unit: 'g', category: 'dairy' },
  { name: 'cheese', quantity: 4, unit: 'oz', category: 'dairy' },
];

/**
 * Ingredients covering all categories
 */
export const allCategoriesIngredients: IngredientInput[] = [
  { name: 'lettuce', quantity: 1, unit: 'piece', category: 'produce' },
  { name: 'ground beef', quantity: 1, unit: 'lb', category: 'meat' },
  { name: 'salmon', quantity: 8, unit: 'oz', category: 'seafood' },
  { name: 'milk', quantity: 1, unit: 'cup', category: 'dairy' },
  { name: 'bread', quantity: 1, unit: 'piece', category: 'bakery' },
  { name: 'frozen peas', quantity: 1, unit: 'cup', category: 'frozen' },
  { name: 'pasta', quantity: 1, unit: 'lb', category: 'pantry' },
  { name: 'cumin', quantity: 1, unit: 'tsp', category: 'spices' },
  { name: 'orange juice', quantity: 1, unit: 'cup', category: 'beverages' },
  { name: 'misc item', quantity: 1, unit: 'piece', category: 'other' },
];

/**
 * Ingredients with imprecise measurements
 */
export const impreciseIngredients: IngredientInput[] = [
  { name: 'salt', quantity: 1, unit: 'to_taste', category: 'spices' },
  { name: 'pepper', quantity: 1, unit: 'to_taste', category: 'spices' },
  { name: 'herbs', quantity: 1, unit: 'pinch', category: 'spices' },
  { name: 'hot sauce', quantity: 1, unit: 'dash', category: 'pantry' },
];

/**
 * Large shopping list (many items)
 */
export const largeShoppingList: IngredientInput[] = Array.from({ length: 50 }, (_, i) => ({
  name: `Ingredient ${i + 1}`,
  quantity: (i + 1) * 0.5,
  unit: ['cup', 'tbsp', 'tsp', 'oz', 'g', 'piece'][i % 6] as Unit,
  category: [
    'produce', 'meat', 'seafood', 'dairy', 'bakery',
    'frozen', 'pantry', 'spices', 'beverages', 'other'
  ][i % 10] as IngredientCategory,
}));

/**
 * Ingredients with very small quantities
 */
export const smallQuantityIngredients: IngredientInput[] = [
  { name: 'saffron', quantity: 0.0625, unit: 'tsp', category: 'spices' },
  { name: 'vanilla extract', quantity: 0.125, unit: 'tsp', category: 'pantry' },
  { name: 'cayenne', quantity: 0.03125, unit: 'tsp', category: 'spices' },
];

/**
 * Ingredients with very large quantities
 */
export const largeQuantityIngredients: IngredientInput[] = [
  { name: 'water', quantity: 5, unit: 'gallon', category: 'beverages' },
  { name: 'flour', quantity: 25, unit: 'lb', category: 'pantry' },
  { name: 'potatoes', quantity: 50, unit: 'piece', category: 'produce' },
];

/**
 * Ingredients with Unicode names
 */
export const unicodeIngredients: IngredientInput[] = [
  { name: '豆腐 (Tofu)', quantity: 400, unit: 'g', category: 'produce' },
  { name: 'Crème fraîche', quantity: 1, unit: 'cup', category: 'dairy' },
  { name: 'Jalapeño 🌶️', quantity: 2, unit: 'piece', category: 'produce' },
  { name: 'Gruyère cheese', quantity: 200, unit: 'g', category: 'dairy' },
  { name: 'Açaí berries', quantity: 1, unit: 'cup', category: 'frozen' },
];

/**
 * Ingredients with special characters in names
 */
export const specialCharIngredients: IngredientInput[] = [
  { name: "Baker's chocolate (70%)", quantity: 4, unit: 'oz', category: 'pantry' },
  { name: 'Half & half', quantity: 1, unit: 'cup', category: 'dairy' },
  { name: 'All-purpose flour', quantity: 2, unit: 'cup', category: 'pantry' },
  { name: 'Self-rising flour', quantity: 1, unit: 'cup', category: 'pantry' },
];

/**
 * Ingredients with notes
 */
export const ingredientsWithNotes: IngredientInput[] = [
  {
    name: 'tomatoes',
    quantity: 4,
    unit: 'piece',
    category: 'produce',
    notes: 'Roma tomatoes preferred',
  },
  {
    name: 'olive oil',
    quantity: 0.25,
    unit: 'cup',
    category: 'pantry',
    notes: 'Extra virgin',
  },
  {
    name: 'chicken',
    quantity: 2,
    unit: 'lb',
    category: 'meat',
    notes: 'Boneless, skinless thighs',
  },
];

/**
 * Shopping list scenarios for testing
 */
export const shoppingScenarios = {
  /** Simple single recipe */
  singleRecipe: {
    ingredients: simpleIngredients,
    expectedItems: 5,
    expectedCategories: 3,
  },

  /** Multiple recipes with consolidation */
  multipleRecipes: {
    ingredients: [...simpleIngredients, ...consolidatableIngredients],
    expectedConsolidation: true,
  },

  /** Mixed units (no consolidation) */
  mixedUnits: {
    ingredients: differentUnitsIngredients,
    expectedItems: 4, // All separate
  },

  /** Full category coverage */
  allCategories: {
    ingredients: allCategoriesIngredients,
    expectedCategories: 10,
  },

  /** Large list */
  large: {
    ingredients: largeShoppingList,
    expectedItems: 50,
  },
};

/**
 * Create a shopping list with cook-by dates
 */
export function createShoppingWithDates(
  ingredients: IngredientInput[],
  cookDate: Date
): Array<IngredientInput & { cookByDate: Date }> {
  return ingredients.map((ing, index) => ({
    ...ing,
    cookByDate: new Date(cookDate.getTime() + index * 24 * 60 * 60 * 1000),
  }));
}

/**
 * Create ingredients for meal prep (multiple recipes sharing ingredients)
 */
export function createMealPrepIngredients(): {
  recipe1: IngredientInput[];
  recipe2: IngredientInput[];
  recipe3: IngredientInput[];
  expectedConsolidated: number;
} {
  return {
    recipe1: [
      { name: 'chicken breast', quantity: 1, unit: 'lb', category: 'meat' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp', category: 'pantry' },
      { name: 'garlic', quantity: 4, unit: 'piece', category: 'produce' },
      { name: 'salt', quantity: 1, unit: 'tsp', category: 'spices' },
    ],
    recipe2: [
      { name: 'chicken breast', quantity: 1.5, unit: 'lb', category: 'meat' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp', category: 'pantry' },
      { name: 'lemon', quantity: 2, unit: 'piece', category: 'produce' },
      { name: 'salt', quantity: 0.5, unit: 'tsp', category: 'spices' },
    ],
    recipe3: [
      { name: 'salmon', quantity: 1, unit: 'lb', category: 'seafood' },
      { name: 'olive oil', quantity: 1, unit: 'tbsp', category: 'pantry' },
      { name: 'garlic', quantity: 2, unit: 'piece', category: 'produce' },
      { name: 'dill', quantity: 2, unit: 'tbsp', category: 'produce' },
    ],
    // chicken: 2.5 lb, olive oil: 6 tbsp, garlic: 6 pieces, salt: 1.5 tsp, lemon: 2, salmon: 1 lb, dill: 2 tbsp
    expectedConsolidated: 7,
  };
}
