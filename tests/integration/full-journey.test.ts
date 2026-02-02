import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { MenuService } from '../../src/services/menu-service.js';
import { ShoppingService } from '../../src/services/shopping-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { ExportService } from '../../src/services/export-service.js';
import { RecipeInput } from '../../src/types/recipe.js';

describe('Sous Chef Full User Journey', () => {
  let db: Database;
  let recipeService: RecipeService;
  let menuService: MenuService;
  let shoppingService: ShoppingService;
  let statisticsService: StatisticsService;
  let exportService: ExportService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    menuService = new MenuService(db);
    shoppingService = new ShoppingService(db, menuService, recipeService);
    statisticsService = new StatisticsService(db);
    exportService = new ExportService(db);
  });

  it('should complete a full cycle from recipe creation to data export/import', async () => {
    // 1. Create a recipe
    const recipeInput: RecipeInput = {
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: [
        { name: 'Spaghetti', quantity: 200, unit: 'g', category: 'pantry' },
        { name: 'Eggs', quantity: 2, unit: 'piece', category: 'dairy' },
        { name: 'Pancetta', quantity: 100, unit: 'g', category: 'meat' },
        { name: 'Pecorino Romano', quantity: 50, unit: 'g', category: 'dairy' }
      ],
      instructions: [
        { text: 'Boil pasta' },
        { text: 'Fry pancetta' },
        { text: 'Mix eggs and cheese' },
        { text: 'Combine everything' }
      ],
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 2,
      tags: ['italian', 'pasta']
    };

    const recipe = recipeService.createRecipe(recipeInput);
    expect(recipe.id).toBeDefined();
    expect(recipe.title).toBe('Pasta Carbonara');

    // 2. Update the recipe
    const updatedInput = { ...recipeInput, servings: 3 };
    const updatedRecipe = recipeService.updateRecipe(recipe.id, updatedInput);
    expect(updatedRecipe.currentVersion).toBe(2);
    expect(updatedRecipe.servings).toBe(3);

    // 3. Plan a menu
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    const menu = menuService.createMenu({
      name: 'Week 1 Plan',
      startDate,
      endDate
    });

    menuService.assignRecipe(menu.id, {
      recipeId: recipe.id,
      date: startDate,
      mealSlot: 'dinner',
      servings: 3
    });

    const fullMenu = menuService.getMenu(menu.id);
    expect(fullMenu?.assignments).toHaveLength(1);

    // 4. Generate shopping list
    const shoppingList = shoppingService.generateFromMenu(menu.id);
    expect(shoppingList.items).toHaveLength(4);
    expect(shoppingList.items.find(i => i.name === 'Spaghetti')?.quantity).toBe(200);

    // 5. Log a cook session
    statisticsService.logCookSession({
      recipeId: recipe.id,
      date: new Date(),
      actualPrepMinutes: 12,
      actualCookMinutes: 14,
      servingsMade: 3
    });

    const stats = statisticsService.getCookStats(recipe.id);
    expect(stats.timesCooked).toBe(1);
    expect(stats.avgCookTime?.minutes).toBe(14);

    // 6. Rate the recipe
    statisticsService.rateRecipe({
      recipeId: recipe.id,
      rating: 5
    });

    const recipeWithRating = recipeService.getRecipe(recipe.id);
    expect(recipeWithRating?.rating).toBe(5);

    // 7. Search
    const searchResults = recipeService.searchRecipes('Carbonara');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe(recipe.id);

    // 8. Export and Import
    const fullExport = exportService.exportAll();
    expect(fullExport.recipes).toHaveLength(1);

    // New database for import
    const db2 = await createDatabase();
    const exportService2 = new ExportService(db2);
    const recipeService2 = new RecipeService(db2);

    const importResult = exportService2.importRecipes(fullExport);
    expect(importResult.recipesImported).toBe(1);

    const allRecipes = recipeService2.listRecipes();
    expect(allRecipes).toHaveLength(1);
    expect(allRecipes[0].title).toBe('Pasta Carbonara');
  });
});
