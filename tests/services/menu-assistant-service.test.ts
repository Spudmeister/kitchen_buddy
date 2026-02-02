import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDatabase, Database } from '../../src/db/database.js';
import { MenuAssistantService } from '../../src/services/menu-assistant-service.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import { RecipeInput } from '../../src/types/recipe.js';

describe('MenuAssistantService', () => {
  let db: Database;
  let repo: RecipeRepository;
  let service: MenuAssistantService;

  beforeEach(async () => {
    db = await createDatabase();
    repo = new RecipeRepository(db);
    service = new MenuAssistantService(db);
  });

  it('should filter recipes by constraints', async () => {
    const input1: RecipeInput = {
      title: 'Quick Salad',
      ingredients: [],
      instructions: [],
      prepTimeMinutes: 10,
      cookTimeMinutes: 0,
      servings: 2,
      tags: ['healthy', 'quick']
    };
    const input2: RecipeInput = {
      title: 'Slow Roast',
      ingredients: [],
      instructions: [],
      prepTimeMinutes: 20,
      cookTimeMinutes: 120,
      servings: 6,
      tags: ['dinner']
    };

    repo.createRecipe(input1);
    repo.createRecipe(input2);

    service.setConstraints({ maxTotalTime: 30 });
    const results = service.filterRecipesByConstraints();

    // Total time is prep + cook
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Quick Salad');
  });

  it('should track conversation history', async () => {
    // Mock isAvailable to return true so we can call chat
    vi.spyOn(service, 'isAvailable').mockResolvedValue(true);
    // Mock buildResponse to avoid real AI call
    vi.spyOn(service as any, 'buildResponse').mockResolvedValue({
      message: 'Here is a suggestion',
      suggestions: [],
    });

    await service.chat('What should I cook?');
    const history = service.getConversationHistory();
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });
});
