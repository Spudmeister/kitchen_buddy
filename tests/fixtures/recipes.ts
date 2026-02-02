/**
 * Recipe Test Fixtures for Sous Chef
 * 
 * 50+ sample recipes covering various edge cases:
 * - Empty/minimal recipes
 * - Large recipes (many ingredients/instructions)
 * - Unicode characters in all text fields
 * - Mixed units
 * - Various cuisines and dietary categories
 * 
 * Requirements: Design - Testing Strategy
 */

import type { RecipeInput, IngredientInput, InstructionInput, IngredientCategory } from '../../src/types/recipe.js';
import type { Unit } from '../../src/types/units.js';

/**
 * Minimal valid recipe - edge case for minimum required fields
 */
export const minimalRecipe: RecipeInput = {
  title: 'Minimal Recipe',
  ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
  instructions: [{ text: 'Boil water.' }],
  prepTimeMinutes: 0,
  cookTimeMinutes: 1,
  servings: 1,
};

/**
 * Recipe with empty optional fields
 */
export const emptyOptionalFieldsRecipe: RecipeInput = {
  title: 'Empty Optional Fields',
  description: undefined,
  ingredients: [{ name: 'salt', quantity: 1, unit: 'pinch' }],
  instructions: [{ text: 'Add salt.' }],
  prepTimeMinutes: 0,
  cookTimeMinutes: 0,
  servings: 1,
  tags: undefined,
  sourceUrl: undefined,
  folderId: undefined,
  parentRecipeId: undefined,
};

/**
 * Large recipe with many ingredients (50+)
 */
export const largeRecipe: RecipeInput = {
  title: 'Large Recipe with Many Ingredients',
  description: 'A complex recipe to test handling of large ingredient lists',
  ingredients: Array.from({ length: 55 }, (_, i) => ({
    name: `Ingredient ${i + 1}`,
    quantity: (i + 1) * 0.5,
    unit: ['cup', 'tbsp', 'tsp', 'oz', 'g'][i % 5] as Unit,
    notes: i % 3 === 0 ? `Note for ingredient ${i + 1}` : undefined,
    category: ['produce', 'meat', 'dairy', 'pantry', 'spices'][i % 5] as IngredientCategory,
  })),
  instructions: Array.from({ length: 30 }, (_, i) => ({
    text: `Step ${i + 1}: Perform action ${i + 1} with the ingredients.`,
    durationMinutes: (i + 1) * 2,
    notes: i % 4 === 0 ? `Tip for step ${i + 1}` : undefined,
  })),
  prepTimeMinutes: 120,
  cookTimeMinutes: 180,
  servings: 12,
  tags: ['complex', 'large', 'test'],
};

/**
 * Recipe with Unicode characters in all text fields
 */
export const unicodeRecipe: RecipeInput = {
  title: '日本料理 - Sushi Roll 🍣',
  description: 'Délicieux sushi avec des ingrédients frais. 美味しい寿司。',
  ingredients: [
    { name: '米 (Rice)', quantity: 2, unit: 'cup', notes: '短粒米が最適' },
    { name: 'Nori 海苔', quantity: 4, unit: 'piece', category: 'pantry' },
    { name: 'Saumon frais 🐟', quantity: 200, unit: 'g', category: 'seafood' },
    { name: 'Avocat 🥑', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'Vinaigre de riz 酢', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'Wasabi わさび', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'Gingembre mariné 生姜', quantity: 50, unit: 'g', category: 'produce' },
  ],
  instructions: [
    { text: '米を洗って炊く。Rinse and cook the rice.' },
    { text: 'Mélanger le vinaigre avec le riz chaud. 酢を混ぜる。' },
    { text: 'Étaler le riz sur le nori. 海苔の上にご飯を広げる。' },
    { text: 'Ajouter le saumon et l\'avocat. サーモンとアボカドを加える。' },
    { text: 'Rouler délicatement. 巻く。🍣' },
  ],
  prepTimeMinutes: 30,
  cookTimeMinutes: 20,
  servings: 4,
  tags: ['japanese', '日本料理', 'sushi', 'seafood', '🍣'],
};

/**
 * Recipe with mixed US and metric units
 */
export const mixedUnitsRecipe: RecipeInput = {
  title: 'Mixed Units Recipe',
  description: 'Recipe using both US and metric measurements',
  ingredients: [
    { name: 'flour', quantity: 2, unit: 'cup', category: 'pantry' },
    { name: 'sugar', quantity: 100, unit: 'g', category: 'pantry' },
    { name: 'butter', quantity: 4, unit: 'oz', category: 'dairy' },
    { name: 'milk', quantity: 250, unit: 'ml', category: 'dairy' },
    { name: 'eggs', quantity: 3, unit: 'piece', category: 'dairy' },
    { name: 'salt', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'vanilla', quantity: 5, unit: 'ml', category: 'pantry' },
    { name: 'baking powder', quantity: 2, unit: 'tsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Mix dry ingredients.', durationMinutes: 5 },
    { text: 'Combine wet ingredients.', durationMinutes: 3 },
    { text: 'Mix together and bake.', durationMinutes: 30 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  servings: 8,
  tags: ['baking', 'mixed-units'],
};

/**
 * Quick recipe (under 15 minutes total)
 */
export const quickRecipe: RecipeInput = {
  title: 'Quick Scrambled Eggs',
  description: 'Fast and easy breakfast',
  ingredients: [
    { name: 'eggs', quantity: 3, unit: 'piece', category: 'dairy' },
    { name: 'butter', quantity: 1, unit: 'tbsp', category: 'dairy' },
    { name: 'salt', quantity: 1, unit: 'pinch', category: 'spices' },
    { name: 'pepper', quantity: 1, unit: 'dash', category: 'spices' },
  ],
  instructions: [
    { text: 'Beat eggs in a bowl.', durationMinutes: 1 },
    { text: 'Melt butter in pan over medium heat.', durationMinutes: 1 },
    { text: 'Add eggs and stir until cooked.', durationMinutes: 3 },
  ],
  prepTimeMinutes: 2,
  cookTimeMinutes: 5,
  servings: 1,
  tags: ['quick', 'breakfast', 'easy', 'vegetarian'],
};


/**
 * Vegan recipe
 */
export const veganRecipe: RecipeInput = {
  title: 'Vegan Buddha Bowl',
  description: 'Healthy plant-based meal',
  ingredients: [
    { name: 'quinoa', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'chickpeas', quantity: 400, unit: 'g', category: 'pantry' },
    { name: 'sweet potato', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'kale', quantity: 2, unit: 'cup', category: 'produce' },
    { name: 'avocado', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'tahini', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'lemon juice', quantity: 2, unit: 'tbsp', category: 'produce' },
    { name: 'olive oil', quantity: 2, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Cook quinoa according to package directions.', durationMinutes: 15 },
    { text: 'Roast sweet potato cubes at 400°F.', durationMinutes: 25 },
    { text: 'Massage kale with olive oil.', durationMinutes: 2 },
    { text: 'Assemble bowls with all ingredients.', durationMinutes: 5 },
    { text: 'Drizzle with tahini dressing.', durationMinutes: 2 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  servings: 4,
  tags: ['vegan', 'healthy', 'bowl', 'gluten-free'],
};

/**
 * Gluten-free recipe
 */
export const glutenFreeRecipe: RecipeInput = {
  title: 'Gluten-Free Pasta Primavera',
  description: 'Delicious pasta with fresh vegetables',
  ingredients: [
    { name: 'gluten-free pasta', quantity: 400, unit: 'g', category: 'pantry' },
    { name: 'zucchini', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'bell pepper', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'cherry tomatoes', quantity: 1, unit: 'cup', category: 'produce' },
    { name: 'garlic', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'olive oil', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'parmesan', quantity: 50, unit: 'g', category: 'dairy' },
    { name: 'basil', quantity: 0.25, unit: 'cup', category: 'produce' },
  ],
  instructions: [
    { text: 'Cook pasta according to package directions.', durationMinutes: 10 },
    { text: 'Sauté vegetables in olive oil.', durationMinutes: 8 },
    { text: 'Combine pasta with vegetables.', durationMinutes: 2 },
    { text: 'Top with parmesan and basil.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 4,
  tags: ['gluten-free', 'pasta', 'vegetarian', 'italian'],
};

/**
 * Slow cooker recipe (long cook time)
 */
export const slowCookerRecipe: RecipeInput = {
  title: 'Slow Cooker Beef Stew',
  description: 'Hearty comfort food that cooks all day',
  ingredients: [
    { name: 'beef chuck', quantity: 2, unit: 'lb', category: 'meat' },
    { name: 'potatoes', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'carrots', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'onion', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'beef broth', quantity: 4, unit: 'cup', category: 'pantry' },
    { name: 'tomato paste', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'worcestershire sauce', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'thyme', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'bay leaves', quantity: 2, unit: 'piece', category: 'spices' },
  ],
  instructions: [
    { text: 'Cut beef into 2-inch cubes.', durationMinutes: 10 },
    { text: 'Chop vegetables into large pieces.', durationMinutes: 10 },
    { text: 'Add all ingredients to slow cooker.', durationMinutes: 5 },
    { text: 'Cook on low for 8 hours.', durationMinutes: 480 },
  ],
  prepTimeMinutes: 25,
  cookTimeMinutes: 480,
  servings: 8,
  tags: ['slow-cooker', 'beef', 'comfort-food', 'winter'],
};

/**
 * Dessert recipe
 */
export const dessertRecipe: RecipeInput = {
  title: 'Chocolate Lava Cake',
  description: 'Decadent molten chocolate dessert',
  ingredients: [
    { name: 'dark chocolate', quantity: 200, unit: 'g', category: 'pantry' },
    { name: 'butter', quantity: 100, unit: 'g', category: 'dairy' },
    { name: 'eggs', quantity: 4, unit: 'piece', category: 'dairy' },
    { name: 'sugar', quantity: 100, unit: 'g', category: 'pantry' },
    { name: 'flour', quantity: 50, unit: 'g', category: 'pantry' },
    { name: 'vanilla extract', quantity: 1, unit: 'tsp', category: 'pantry' },
    { name: 'cocoa powder', quantity: 2, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Melt chocolate and butter together.', durationMinutes: 5 },
    { text: 'Whisk eggs and sugar until fluffy.', durationMinutes: 5 },
    { text: 'Fold chocolate mixture into eggs.', durationMinutes: 2 },
    { text: 'Add flour and vanilla.', durationMinutes: 2 },
    { text: 'Pour into greased ramekins.', durationMinutes: 3 },
    { text: 'Bake at 425°F for 12-14 minutes.', durationMinutes: 14 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 14,
  servings: 4,
  tags: ['dessert', 'chocolate', 'french', 'special-occasion'],
};

/**
 * Seafood recipe
 */
export const seafoodRecipe: RecipeInput = {
  title: 'Garlic Butter Shrimp',
  description: 'Quick and flavorful shrimp dish',
  ingredients: [
    { name: 'large shrimp', quantity: 1, unit: 'lb', category: 'seafood' },
    { name: 'butter', quantity: 4, unit: 'tbsp', category: 'dairy' },
    { name: 'garlic', quantity: 6, unit: 'piece', category: 'produce' },
    { name: 'white wine', quantity: 0.5, unit: 'cup', category: 'beverages' },
    { name: 'lemon juice', quantity: 2, unit: 'tbsp', category: 'produce' },
    { name: 'parsley', quantity: 0.25, unit: 'cup', category: 'produce' },
    { name: 'red pepper flakes', quantity: 0.5, unit: 'tsp', category: 'spices' },
  ],
  instructions: [
    { text: 'Peel and devein shrimp.', durationMinutes: 10 },
    { text: 'Melt butter and sauté garlic.', durationMinutes: 2 },
    { text: 'Add shrimp and cook until pink.', durationMinutes: 4 },
    { text: 'Add wine and lemon juice.', durationMinutes: 2 },
    { text: 'Garnish with parsley.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 10,
  servings: 4,
  tags: ['seafood', 'quick', 'garlic', 'low-carb'],
};

/**
 * Breakfast recipe
 */
export const breakfastRecipe: RecipeInput = {
  title: 'Fluffy Pancakes',
  description: 'Classic American breakfast pancakes',
  ingredients: [
    { name: 'all-purpose flour', quantity: 1.5, unit: 'cup', category: 'pantry' },
    { name: 'baking powder', quantity: 3.5, unit: 'tsp', category: 'pantry' },
    { name: 'salt', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'sugar', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'milk', quantity: 1.25, unit: 'cup', category: 'dairy' },
    { name: 'egg', quantity: 1, unit: 'piece', category: 'dairy' },
    { name: 'melted butter', quantity: 3, unit: 'tbsp', category: 'dairy' },
  ],
  instructions: [
    { text: 'Mix dry ingredients in a large bowl.', durationMinutes: 2 },
    { text: 'Make a well and add wet ingredients.', durationMinutes: 2 },
    { text: 'Stir until just combined (lumps are okay).', durationMinutes: 1 },
    { text: 'Heat griddle to 375°F.', durationMinutes: 3 },
    { text: 'Pour 1/4 cup batter per pancake.', durationMinutes: 1 },
    { text: 'Flip when bubbles form, cook until golden.', durationMinutes: 4 },
  ],
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 4,
  tags: ['breakfast', 'american', 'vegetarian', 'classic'],
};


/**
 * Italian recipe
 */
export const italianRecipe: RecipeInput = {
  title: 'Spaghetti Carbonara',
  description: 'Classic Roman pasta dish',
  ingredients: [
    { name: 'spaghetti', quantity: 400, unit: 'g', category: 'pantry' },
    { name: 'guanciale', quantity: 200, unit: 'g', category: 'meat' },
    { name: 'egg yolks', quantity: 4, unit: 'piece', category: 'dairy' },
    { name: 'whole eggs', quantity: 2, unit: 'piece', category: 'dairy' },
    { name: 'pecorino romano', quantity: 100, unit: 'g', category: 'dairy' },
    { name: 'black pepper', quantity: 2, unit: 'tsp', category: 'spices' },
  ],
  instructions: [
    { text: 'Bring large pot of salted water to boil.', durationMinutes: 10 },
    { text: 'Cut guanciale into small strips.', durationMinutes: 5 },
    { text: 'Cook guanciale until crispy.', durationMinutes: 8 },
    { text: 'Mix eggs, yolks, and cheese.', durationMinutes: 3 },
    { text: 'Cook pasta until al dente.', durationMinutes: 10 },
    { text: 'Toss hot pasta with guanciale off heat.', durationMinutes: 1 },
    { text: 'Add egg mixture and toss quickly.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 4,
  tags: ['italian', 'pasta', 'roman', 'classic'],
};

/**
 * Mexican recipe
 */
export const mexicanRecipe: RecipeInput = {
  title: 'Chicken Tacos',
  description: 'Authentic Mexican street tacos',
  ingredients: [
    { name: 'chicken thighs', quantity: 1.5, unit: 'lb', category: 'meat' },
    { name: 'corn tortillas', quantity: 12, unit: 'piece', category: 'bakery' },
    { name: 'onion', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'cilantro', quantity: 0.5, unit: 'cup', category: 'produce' },
    { name: 'lime', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'cumin', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'chili powder', quantity: 1, unit: 'tbsp', category: 'spices' },
    { name: 'garlic powder', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'salsa verde', quantity: 0.5, unit: 'cup', category: 'pantry' },
  ],
  instructions: [
    { text: 'Season chicken with spices.', durationMinutes: 5 },
    { text: 'Grill or pan-fry chicken until cooked.', durationMinutes: 15 },
    { text: 'Rest and slice chicken.', durationMinutes: 5 },
    { text: 'Warm tortillas.', durationMinutes: 2 },
    { text: 'Assemble tacos with toppings.', durationMinutes: 5 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 4,
  tags: ['mexican', 'tacos', 'chicken', 'quick'],
};

/**
 * Asian recipe
 */
export const asianRecipe: RecipeInput = {
  title: 'Pad Thai',
  description: 'Classic Thai stir-fried noodles',
  ingredients: [
    { name: 'rice noodles', quantity: 250, unit: 'g', category: 'pantry' },
    { name: 'shrimp', quantity: 200, unit: 'g', category: 'seafood' },
    { name: 'tofu', quantity: 150, unit: 'g', category: 'produce' },
    { name: 'eggs', quantity: 2, unit: 'piece', category: 'dairy' },
    { name: 'bean sprouts', quantity: 1, unit: 'cup', category: 'produce' },
    { name: 'green onions', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'peanuts', quantity: 0.25, unit: 'cup', category: 'pantry' },
    { name: 'fish sauce', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'tamarind paste', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'palm sugar', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'lime', quantity: 1, unit: 'piece', category: 'produce' },
  ],
  instructions: [
    { text: 'Soak rice noodles in warm water.', durationMinutes: 30 },
    { text: 'Make pad thai sauce by mixing fish sauce, tamarind, and sugar.', durationMinutes: 3 },
    { text: 'Stir-fry tofu until golden.', durationMinutes: 5 },
    { text: 'Cook shrimp and set aside.', durationMinutes: 3 },
    { text: 'Scramble eggs in wok.', durationMinutes: 2 },
    { text: 'Add noodles and sauce, toss well.', durationMinutes: 3 },
    { text: 'Add bean sprouts and green onions.', durationMinutes: 1 },
    { text: 'Serve with peanuts and lime.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 35,
  cookTimeMinutes: 15,
  servings: 4,
  tags: ['thai', 'asian', 'noodles', 'stir-fry'],
};

/**
 * Indian recipe
 */
export const indianRecipe: RecipeInput = {
  title: 'Chicken Tikka Masala',
  description: 'Creamy tomato-based curry',
  ingredients: [
    { name: 'chicken breast', quantity: 1.5, unit: 'lb', category: 'meat' },
    { name: 'yogurt', quantity: 1, unit: 'cup', category: 'dairy' },
    { name: 'heavy cream', quantity: 1, unit: 'cup', category: 'dairy' },
    { name: 'tomato sauce', quantity: 2, unit: 'cup', category: 'pantry' },
    { name: 'onion', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'garlic', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'ginger', quantity: 1, unit: 'tbsp', category: 'produce' },
    { name: 'garam masala', quantity: 2, unit: 'tsp', category: 'spices' },
    { name: 'turmeric', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'cumin', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'paprika', quantity: 1, unit: 'tbsp', category: 'spices' },
    { name: 'cilantro', quantity: 0.25, unit: 'cup', category: 'produce' },
  ],
  instructions: [
    { text: 'Marinate chicken in yogurt and spices for 2 hours.', durationMinutes: 120 },
    { text: 'Grill or broil chicken until charred.', durationMinutes: 15 },
    { text: 'Sauté onion, garlic, and ginger.', durationMinutes: 8 },
    { text: 'Add tomato sauce and spices.', durationMinutes: 5 },
    { text: 'Simmer sauce for 15 minutes.', durationMinutes: 15 },
    { text: 'Add cream and chicken, simmer.', durationMinutes: 10 },
    { text: 'Garnish with cilantro.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 130,
  cookTimeMinutes: 55,
  servings: 6,
  tags: ['indian', 'curry', 'chicken', 'spicy'],
};

/**
 * Mediterranean recipe
 */
export const mediterraneanRecipe: RecipeInput = {
  title: 'Greek Salad',
  description: 'Fresh and healthy Mediterranean salad',
  ingredients: [
    { name: 'cucumber', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'tomatoes', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'red onion', quantity: 0.5, unit: 'piece', category: 'produce' },
    { name: 'feta cheese', quantity: 200, unit: 'g', category: 'dairy' },
    { name: 'kalamata olives', quantity: 0.5, unit: 'cup', category: 'pantry' },
    { name: 'olive oil', quantity: 4, unit: 'tbsp', category: 'pantry' },
    { name: 'red wine vinegar', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'oregano', quantity: 1, unit: 'tsp', category: 'spices' },
  ],
  instructions: [
    { text: 'Cut cucumber and tomatoes into chunks.', durationMinutes: 5 },
    { text: 'Slice red onion thinly.', durationMinutes: 2 },
    { text: 'Combine vegetables in a bowl.', durationMinutes: 1 },
    { text: 'Add olives and crumbled feta.', durationMinutes: 2 },
    { text: 'Drizzle with olive oil and vinegar.', durationMinutes: 1 },
    { text: 'Sprinkle with oregano.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 0,
  servings: 4,
  tags: ['greek', 'mediterranean', 'salad', 'vegetarian', 'healthy'],
};

/**
 * Soup recipe
 */
export const soupRecipe: RecipeInput = {
  title: 'Tomato Basil Soup',
  description: 'Creamy homemade tomato soup',
  ingredients: [
    { name: 'canned tomatoes', quantity: 28, unit: 'oz', category: 'pantry' },
    { name: 'vegetable broth', quantity: 2, unit: 'cup', category: 'pantry' },
    { name: 'onion', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'garlic', quantity: 3, unit: 'piece', category: 'produce' },
    { name: 'fresh basil', quantity: 0.5, unit: 'cup', category: 'produce' },
    { name: 'heavy cream', quantity: 0.5, unit: 'cup', category: 'dairy' },
    { name: 'butter', quantity: 2, unit: 'tbsp', category: 'dairy' },
    { name: 'sugar', quantity: 1, unit: 'tsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Sauté onion and garlic in butter.', durationMinutes: 5 },
    { text: 'Add tomatoes and broth.', durationMinutes: 2 },
    { text: 'Simmer for 20 minutes.', durationMinutes: 20 },
    { text: 'Blend until smooth.', durationMinutes: 3 },
    { text: 'Stir in cream and basil.', durationMinutes: 2 },
  ],
  prepTimeMinutes: 10,
  cookTimeMinutes: 30,
  servings: 6,
  tags: ['soup', 'vegetarian', 'comfort-food', 'tomato'],
};


/**
 * Baking recipe
 */
export const bakingRecipe: RecipeInput = {
  title: 'Sourdough Bread',
  description: 'Artisan sourdough loaf',
  ingredients: [
    { name: 'bread flour', quantity: 500, unit: 'g', category: 'pantry' },
    { name: 'water', quantity: 350, unit: 'ml', category: 'beverages' },
    { name: 'sourdough starter', quantity: 100, unit: 'g', category: 'pantry' },
    { name: 'salt', quantity: 10, unit: 'g', category: 'spices' },
  ],
  instructions: [
    { text: 'Mix flour and water, autolyse for 30 minutes.', durationMinutes: 30 },
    { text: 'Add starter and salt, mix well.', durationMinutes: 5 },
    { text: 'Perform stretch and folds every 30 minutes for 3 hours.', durationMinutes: 180 },
    { text: 'Shape dough and place in banneton.', durationMinutes: 10 },
    { text: 'Cold proof overnight in refrigerator.', durationMinutes: 720 },
    { text: 'Bake in Dutch oven at 450°F.', durationMinutes: 45 },
  ],
  prepTimeMinutes: 225,
  cookTimeMinutes: 45,
  servings: 1,
  tags: ['baking', 'bread', 'sourdough', 'artisan'],
};

/**
 * Grilling recipe
 */
export const grillingRecipe: RecipeInput = {
  title: 'BBQ Ribs',
  description: 'Fall-off-the-bone tender ribs',
  ingredients: [
    { name: 'pork ribs', quantity: 3, unit: 'lb', category: 'meat' },
    { name: 'brown sugar', quantity: 0.5, unit: 'cup', category: 'pantry' },
    { name: 'paprika', quantity: 2, unit: 'tbsp', category: 'spices' },
    { name: 'garlic powder', quantity: 1, unit: 'tbsp', category: 'spices' },
    { name: 'onion powder', quantity: 1, unit: 'tbsp', category: 'spices' },
    { name: 'cayenne', quantity: 1, unit: 'tsp', category: 'spices' },
    { name: 'bbq sauce', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'apple cider vinegar', quantity: 2, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Remove membrane from ribs.', durationMinutes: 5 },
    { text: 'Mix dry rub ingredients.', durationMinutes: 3 },
    { text: 'Apply rub generously to ribs.', durationMinutes: 5 },
    { text: 'Let ribs sit for 30 minutes.', durationMinutes: 30 },
    { text: 'Smoke or grill at 225°F for 3 hours.', durationMinutes: 180 },
    { text: 'Wrap in foil with vinegar for 2 hours.', durationMinutes: 120 },
    { text: 'Unwrap and glaze with BBQ sauce.', durationMinutes: 30 },
  ],
  prepTimeMinutes: 45,
  cookTimeMinutes: 330,
  servings: 6,
  tags: ['bbq', 'grilling', 'pork', 'american', 'summer'],
};

/**
 * Salad recipe
 */
export const saladRecipe: RecipeInput = {
  title: 'Caesar Salad',
  description: 'Classic Caesar with homemade dressing',
  ingredients: [
    { name: 'romaine lettuce', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'parmesan', quantity: 0.5, unit: 'cup', category: 'dairy' },
    { name: 'croutons', quantity: 1, unit: 'cup', category: 'bakery' },
    { name: 'egg yolk', quantity: 1, unit: 'piece', category: 'dairy' },
    { name: 'garlic', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'anchovy paste', quantity: 1, unit: 'tsp', category: 'pantry' },
    { name: 'lemon juice', quantity: 2, unit: 'tbsp', category: 'produce' },
    { name: 'dijon mustard', quantity: 1, unit: 'tsp', category: 'pantry' },
    { name: 'olive oil', quantity: 0.5, unit: 'cup', category: 'pantry' },
  ],
  instructions: [
    { text: 'Mince garlic and mash with salt.', durationMinutes: 3 },
    { text: 'Whisk egg yolk, anchovy, lemon, and mustard.', durationMinutes: 2 },
    { text: 'Slowly drizzle in olive oil while whisking.', durationMinutes: 5 },
    { text: 'Chop romaine and place in bowl.', durationMinutes: 3 },
    { text: 'Toss with dressing, parmesan, and croutons.', durationMinutes: 2 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 0,
  servings: 4,
  tags: ['salad', 'caesar', 'classic', 'american'],
};

/**
 * Appetizer recipe
 */
export const appetizerRecipe: RecipeInput = {
  title: 'Bruschetta',
  description: 'Italian tomato appetizer',
  ingredients: [
    { name: 'baguette', quantity: 1, unit: 'piece', category: 'bakery' },
    { name: 'roma tomatoes', quantity: 4, unit: 'piece', category: 'produce' },
    { name: 'fresh basil', quantity: 0.25, unit: 'cup', category: 'produce' },
    { name: 'garlic', quantity: 3, unit: 'piece', category: 'produce' },
    { name: 'olive oil', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'balsamic vinegar', quantity: 1, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Dice tomatoes and combine with basil.', durationMinutes: 5 },
    { text: 'Mince garlic and add to tomatoes.', durationMinutes: 2 },
    { text: 'Add olive oil and balsamic, season.', durationMinutes: 2 },
    { text: 'Slice and toast baguette.', durationMinutes: 5 },
    { text: 'Top bread with tomato mixture.', durationMinutes: 3 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 5,
  servings: 8,
  tags: ['appetizer', 'italian', 'vegetarian', 'party'],
};

/**
 * Beverage recipe
 */
export const beverageRecipe: RecipeInput = {
  title: 'Homemade Lemonade',
  description: 'Fresh squeezed lemonade',
  ingredients: [
    { name: 'lemons', quantity: 6, unit: 'piece', category: 'produce' },
    { name: 'sugar', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'water', quantity: 6, unit: 'cup', category: 'beverages' },
    { name: 'mint leaves', quantity: 10, unit: 'piece', category: 'produce' },
  ],
  instructions: [
    { text: 'Make simple syrup by dissolving sugar in 1 cup hot water.', durationMinutes: 5 },
    { text: 'Juice all lemons.', durationMinutes: 10 },
    { text: 'Combine lemon juice, simple syrup, and remaining water.', durationMinutes: 2 },
    { text: 'Add mint leaves and refrigerate.', durationMinutes: 60 },
  ],
  prepTimeMinutes: 20,
  cookTimeMinutes: 0,
  servings: 8,
  tags: ['beverage', 'summer', 'refreshing', 'non-alcoholic'],
};

/**
 * Snack recipe
 */
export const snackRecipe: RecipeInput = {
  title: 'Guacamole',
  description: 'Fresh homemade guacamole',
  ingredients: [
    { name: 'avocados', quantity: 3, unit: 'piece', category: 'produce' },
    { name: 'lime juice', quantity: 2, unit: 'tbsp', category: 'produce' },
    { name: 'red onion', quantity: 0.25, unit: 'cup', category: 'produce' },
    { name: 'cilantro', quantity: 2, unit: 'tbsp', category: 'produce' },
    { name: 'jalapeño', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'garlic', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'salt', quantity: 0.5, unit: 'tsp', category: 'spices' },
    { name: 'cumin', quantity: 0.25, unit: 'tsp', category: 'spices' },
  ],
  instructions: [
    { text: 'Halve avocados and remove pits.', durationMinutes: 2 },
    { text: 'Scoop flesh into bowl and mash.', durationMinutes: 3 },
    { text: 'Finely dice onion, jalapeño, and garlic.', durationMinutes: 5 },
    { text: 'Mix all ingredients together.', durationMinutes: 2 },
    { text: 'Taste and adjust seasoning.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 0,
  servings: 6,
  tags: ['snack', 'mexican', 'vegan', 'gluten-free', 'party'],
};

/**
 * Low-carb recipe
 */
export const lowCarbRecipe: RecipeInput = {
  title: 'Cauliflower Rice Stir Fry',
  description: 'Healthy low-carb alternative to fried rice',
  ingredients: [
    { name: 'cauliflower', quantity: 1, unit: 'piece', category: 'produce' },
    { name: 'eggs', quantity: 2, unit: 'piece', category: 'dairy' },
    { name: 'soy sauce', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'sesame oil', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'green onions', quantity: 3, unit: 'piece', category: 'produce' },
    { name: 'peas', quantity: 0.5, unit: 'cup', category: 'frozen' },
    { name: 'carrots', quantity: 0.5, unit: 'cup', category: 'produce' },
    { name: 'garlic', quantity: 2, unit: 'piece', category: 'produce' },
  ],
  instructions: [
    { text: 'Rice the cauliflower in food processor.', durationMinutes: 5 },
    { text: 'Scramble eggs and set aside.', durationMinutes: 3 },
    { text: 'Sauté garlic and vegetables.', durationMinutes: 5 },
    { text: 'Add cauliflower rice and cook.', durationMinutes: 5 },
    { text: 'Add soy sauce and sesame oil.', durationMinutes: 1 },
    { text: 'Mix in eggs and green onions.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 15,
  servings: 4,
  tags: ['low-carb', 'healthy', 'asian', 'vegetarian'],
};

/**
 * Dairy-free recipe
 */
export const dairyFreeRecipe: RecipeInput = {
  title: 'Coconut Curry',
  description: 'Creamy dairy-free curry',
  ingredients: [
    { name: 'coconut milk', quantity: 400, unit: 'ml', category: 'pantry' },
    { name: 'chicken breast', quantity: 1, unit: 'lb', category: 'meat' },
    { name: 'curry paste', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'bell peppers', quantity: 2, unit: 'piece', category: 'produce' },
    { name: 'bamboo shoots', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'fish sauce', quantity: 2, unit: 'tbsp', category: 'pantry' },
    { name: 'brown sugar', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'thai basil', quantity: 0.5, unit: 'cup', category: 'produce' },
  ],
  instructions: [
    { text: 'Slice chicken into strips.', durationMinutes: 5 },
    { text: 'Fry curry paste in coconut cream.', durationMinutes: 3 },
    { text: 'Add chicken and cook through.', durationMinutes: 8 },
    { text: 'Add remaining coconut milk and vegetables.', durationMinutes: 5 },
    { text: 'Season with fish sauce and sugar.', durationMinutes: 1 },
    { text: 'Garnish with thai basil.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 4,
  tags: ['dairy-free', 'thai', 'curry', 'gluten-free'],
};

/**
 * Nut-free recipe
 */
export const nutFreeRecipe: RecipeInput = {
  title: 'Sunflower Seed Butter Cookies',
  description: 'Allergy-friendly cookies',
  ingredients: [
    { name: 'sunflower seed butter', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'sugar', quantity: 0.75, unit: 'cup', category: 'pantry' },
    { name: 'egg', quantity: 1, unit: 'piece', category: 'dairy' },
    { name: 'baking soda', quantity: 0.5, unit: 'tsp', category: 'pantry' },
    { name: 'vanilla extract', quantity: 1, unit: 'tsp', category: 'pantry' },
    { name: 'chocolate chips', quantity: 0.5, unit: 'cup', category: 'pantry' },
  ],
  instructions: [
    { text: 'Preheat oven to 350°F.', durationMinutes: 10 },
    { text: 'Mix sunflower butter and sugar.', durationMinutes: 2 },
    { text: 'Add egg, baking soda, and vanilla.', durationMinutes: 2 },
    { text: 'Fold in chocolate chips.', durationMinutes: 1 },
    { text: 'Scoop onto baking sheet.', durationMinutes: 5 },
    { text: 'Bake for 10-12 minutes.', durationMinutes: 12 },
  ],
  prepTimeMinutes: 15,
  cookTimeMinutes: 12,
  servings: 24,
  tags: ['nut-free', 'cookies', 'dessert', 'allergy-friendly'],
};


/**
 * Recipe with very small quantities (edge case)
 */
export const smallQuantitiesRecipe: RecipeInput = {
  title: 'Spice Blend',
  description: 'Custom spice mix with tiny measurements',
  ingredients: [
    { name: 'cumin', quantity: 0.125, unit: 'tsp', category: 'spices' },
    { name: 'coriander', quantity: 0.0625, unit: 'tsp', category: 'spices' },
    { name: 'turmeric', quantity: 0.03125, unit: 'tsp', category: 'spices' },
    { name: 'cayenne', quantity: 0.015625, unit: 'tsp', category: 'spices' },
    { name: 'salt', quantity: 0.25, unit: 'pinch', category: 'spices' },
  ],
  instructions: [
    { text: 'Combine all spices in a small bowl.', durationMinutes: 1 },
    { text: 'Mix thoroughly.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 2,
  cookTimeMinutes: 0,
  servings: 1,
  tags: ['spices', 'small-batch'],
};

/**
 * Recipe with very large quantities (edge case)
 */
export const largeQuantitiesRecipe: RecipeInput = {
  title: 'Catering Batch Chili',
  description: 'Large batch for events',
  ingredients: [
    { name: 'ground beef', quantity: 20, unit: 'lb', category: 'meat' },
    { name: 'kidney beans', quantity: 10, unit: 'lb', category: 'pantry' },
    { name: 'diced tomatoes', quantity: 5, unit: 'gallon', category: 'pantry' },
    { name: 'onions', quantity: 10, unit: 'piece', category: 'produce' },
    { name: 'chili powder', quantity: 1, unit: 'cup', category: 'spices' },
    { name: 'cumin', quantity: 0.5, unit: 'cup', category: 'spices' },
  ],
  instructions: [
    { text: 'Brown beef in batches.', durationMinutes: 60 },
    { text: 'Sauté onions.', durationMinutes: 20 },
    { text: 'Combine all ingredients in large pot.', durationMinutes: 15 },
    { text: 'Simmer for 2 hours.', durationMinutes: 120 },
  ],
  prepTimeMinutes: 45,
  cookTimeMinutes: 200,
  servings: 100,
  tags: ['catering', 'large-batch', 'chili'],
};

/**
 * Recipe with special characters in text
 */
export const specialCharsRecipe: RecipeInput = {
  title: 'Crème Brûlée (Classic French)',
  description: 'Rich custard with caramelized sugar top — très délicieux!',
  ingredients: [
    { name: 'heavy cream (35% M.F.)', quantity: 2, unit: 'cup', category: 'dairy' },
    { name: 'vanilla bean (split & scraped)', quantity: 1, unit: 'piece', category: 'pantry' },
    { name: 'egg yolks — large', quantity: 5, unit: 'piece', category: 'dairy' },
    { name: 'sugar (granulated)', quantity: 0.5, unit: 'cup', category: 'pantry' },
    { name: 'sugar for topping', quantity: 4, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Heat cream & vanilla to 180°F (82°C).', durationMinutes: 10 },
    { text: 'Whisk yolks + sugar until pale.', durationMinutes: 3 },
    { text: 'Temper eggs w/ hot cream — slowly!', durationMinutes: 5 },
    { text: 'Strain & pour into ramekins (6 oz each).', durationMinutes: 3 },
    { text: 'Bake @ 325°F in water bath × 45 min.', durationMinutes: 45 },
    { text: 'Chill 4+ hours; torch sugar before serving.', durationMinutes: 240 },
  ],
  prepTimeMinutes: 25,
  cookTimeMinutes: 45,
  servings: 6,
  tags: ['french', 'dessert', 'crème-brûlée', 'special-occasion'],
};

/**
 * Recipe with "to taste" and imprecise measurements
 */
export const impreciseMeasurementsRecipe: RecipeInput = {
  title: 'Simple Vinaigrette',
  description: 'Basic salad dressing',
  ingredients: [
    { name: 'olive oil', quantity: 3, unit: 'tbsp', category: 'pantry' },
    { name: 'vinegar', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'salt', quantity: 1, unit: 'to_taste', category: 'spices' },
    { name: 'pepper', quantity: 1, unit: 'to_taste', category: 'spices' },
    { name: 'herbs', quantity: 1, unit: 'pinch', category: 'spices' },
    { name: 'garlic', quantity: 1, unit: 'dash', category: 'produce' },
  ],
  instructions: [
    { text: 'Combine oil and vinegar.', durationMinutes: 1 },
    { text: 'Season to taste.', durationMinutes: 1 },
    { text: 'Whisk until emulsified.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 5,
  cookTimeMinutes: 0,
  servings: 4,
  tags: ['dressing', 'quick', 'vegan'],
};

/**
 * Recipe with zero prep time
 */
export const zeroPrepRecipe: RecipeInput = {
  title: 'Instant Oatmeal',
  description: 'Quick breakfast with no prep',
  ingredients: [
    { name: 'instant oats', quantity: 1, unit: 'cup', category: 'pantry' },
    { name: 'boiling water', quantity: 1, unit: 'cup', category: 'beverages' },
    { name: 'honey', quantity: 1, unit: 'tbsp', category: 'pantry' },
  ],
  instructions: [
    { text: 'Pour boiling water over oats.', durationMinutes: 1 },
    { text: 'Let sit for 2 minutes.', durationMinutes: 2 },
    { text: 'Drizzle with honey.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 0,
  cookTimeMinutes: 4,
  servings: 1,
  tags: ['breakfast', 'quick', 'easy', 'vegetarian'],
};

/**
 * Recipe with zero cook time (no-cook recipe)
 */
export const noCookRecipe: RecipeInput = {
  title: 'Overnight Oats',
  description: 'No-cook breakfast prepared the night before',
  ingredients: [
    { name: 'rolled oats', quantity: 0.5, unit: 'cup', category: 'pantry' },
    { name: 'milk', quantity: 0.5, unit: 'cup', category: 'dairy' },
    { name: 'yogurt', quantity: 0.25, unit: 'cup', category: 'dairy' },
    { name: 'chia seeds', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'maple syrup', quantity: 1, unit: 'tbsp', category: 'pantry' },
    { name: 'berries', quantity: 0.5, unit: 'cup', category: 'produce' },
  ],
  instructions: [
    { text: 'Combine oats, milk, yogurt, and chia seeds.', durationMinutes: 2 },
    { text: 'Add maple syrup and stir.', durationMinutes: 1 },
    { text: 'Refrigerate overnight.', durationMinutes: 480 },
    { text: 'Top with berries before serving.', durationMinutes: 1 },
  ],
  prepTimeMinutes: 5,
  cookTimeMinutes: 0,
  servings: 1,
  tags: ['breakfast', 'no-cook', 'meal-prep', 'healthy'],
};

/**
 * Recipe with long ingredient notes
 */
export const longNotesRecipe: RecipeInput = {
  title: 'Complex Sauce',
  description: 'Sauce with detailed ingredient notes',
  ingredients: [
    {
      name: 'tomatoes',
      quantity: 2,
      unit: 'lb',
      category: 'produce',
      notes: 'Use San Marzano tomatoes if available, otherwise any high-quality canned whole peeled tomatoes will work. Drain and crush by hand for best texture.',
    },
    {
      name: 'olive oil',
      quantity: 0.25,
      unit: 'cup',
      category: 'pantry',
      notes: 'Extra virgin olive oil preferred. Use a fruity variety for best flavor. Do not substitute with regular olive oil or vegetable oil.',
    },
    {
      name: 'garlic',
      quantity: 6,
      unit: 'piece',
      category: 'produce',
      notes: 'Fresh garlic only - do not use pre-minced or garlic powder. Slice thinly for a milder flavor or mince for more intensity.',
    },
  ],
  instructions: [
    {
      text: 'Heat oil over medium-low heat.',
      durationMinutes: 2,
      notes: 'The oil should shimmer but not smoke. If it smokes, it is too hot and will become bitter.',
    },
    {
      text: 'Add garlic and cook until fragrant.',
      durationMinutes: 3,
      notes: 'Watch carefully - garlic burns easily. It should turn golden, not brown.',
    },
    {
      text: 'Add tomatoes and simmer.',
      durationMinutes: 30,
      notes: 'Stir occasionally. The sauce is done when oil separates and floats on top.',
    },
  ],
  prepTimeMinutes: 10,
  cookTimeMinutes: 35,
  servings: 4,
  tags: ['sauce', 'italian', 'basic'],
};

/**
 * Collection of all recipe fixtures for easy access
 */
export const allRecipeFixtures: RecipeInput[] = [
  minimalRecipe,
  emptyOptionalFieldsRecipe,
  largeRecipe,
  unicodeRecipe,
  mixedUnitsRecipe,
  quickRecipe,
  veganRecipe,
  glutenFreeRecipe,
  slowCookerRecipe,
  dessertRecipe,
  seafoodRecipe,
  breakfastRecipe,
  italianRecipe,
  mexicanRecipe,
  asianRecipe,
  indianRecipe,
  mediterraneanRecipe,
  soupRecipe,
  bakingRecipe,
  grillingRecipe,
  saladRecipe,
  appetizerRecipe,
  beverageRecipe,
  snackRecipe,
  lowCarbRecipe,
  dairyFreeRecipe,
  nutFreeRecipe,
  smallQuantitiesRecipe,
  largeQuantitiesRecipe,
  specialCharsRecipe,
  impreciseMeasurementsRecipe,
  zeroPrepRecipe,
  noCookRecipe,
  longNotesRecipe,
];

/**
 * Get a subset of recipes by tag
 */
export function getRecipesByTag(tag: string): RecipeInput[] {
  return allRecipeFixtures.filter(r => r.tags?.includes(tag));
}

/**
 * Get recipes suitable for specific dietary requirements
 */
export const dietaryRecipes = {
  vegan: [veganRecipe, snackRecipe, impreciseMeasurementsRecipe],
  vegetarian: [quickRecipe, glutenFreeRecipe, mediterraneanRecipe, breakfastRecipe, lowCarbRecipe],
  glutenFree: [veganRecipe, glutenFreeRecipe, snackRecipe, dairyFreeRecipe],
  dairyFree: [veganRecipe, dairyFreeRecipe, snackRecipe],
  nutFree: [nutFreeRecipe],
  lowCarb: [seafoodRecipe, lowCarbRecipe],
};

/**
 * Get recipes by cuisine type
 */
export const cuisineRecipes = {
  italian: [italianRecipe, glutenFreeRecipe, appetizerRecipe],
  mexican: [mexicanRecipe, snackRecipe],
  asian: [unicodeRecipe, asianRecipe, lowCarbRecipe],
  indian: [indianRecipe],
  thai: [dairyFreeRecipe],
  mediterranean: [mediterraneanRecipe],
  american: [breakfastRecipe, saladRecipe, grillingRecipe],
  french: [dessertRecipe, specialCharsRecipe],
};

/**
 * Get recipes by meal type
 */
export const mealTypeRecipes = {
  breakfast: [quickRecipe, breakfastRecipe, zeroPrepRecipe, noCookRecipe],
  lunch: [mediterraneanRecipe, saladRecipe, soupRecipe],
  dinner: [italianRecipe, mexicanRecipe, asianRecipe, indianRecipe, slowCookerRecipe],
  snack: [snackRecipe, appetizerRecipe],
  dessert: [dessertRecipe, nutFreeRecipe, specialCharsRecipe],
  beverage: [beverageRecipe],
};
