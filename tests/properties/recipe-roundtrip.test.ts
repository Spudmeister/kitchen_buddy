/**
 * Property Test: Recipe Data Round-Trip Persistence
 * 
 * **Feature: sous-chef, Property 1: Recipe Data Round-Trip Persistence**
 * **Validates: Requirements 1.1, 9.4**
 * 
 * For any valid recipe with all fields populated (title, ingredients, instructions,
 * prep time, cook time, servings), storing the recipe and then retrieving it
 * SHALL return an equivalent recipe with all fields preserved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';
import type { RecipeInput } from '../../src/types/recipe.js';

describe('Property 1: Recipe Data Round-Trip Persistence', () => {
  let db: Database;
  let repo: RecipeRepository;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    db = await createDatabase();
    repo = new RecipeRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Helper to compare recipe input with retrieved recipe
   */
  function assertRecipeEquivalent(input: RecipeInput, retrieved: NonNullable<ReturnType<RecipeRepository['getRecipe']>>): void {
    // Title
    expect(retrieved.title).toBe(input.title);

    // Description
    expect(retrieved.description).toBe(input.description);

    // Prep and cook times
    expect(retrieved.prepTime.minutes).toBe(input.prepTimeMinutes);
    expect(retrieved.cookTime.minutes).toBe(input.cookTimeMinutes);

    // Servings
    expect(retrieved.servings).toBe(input.servings);

    // Source URL
    expect(retrieved.sourceUrl).toBe(input.sourceUrl);

    // Ingredients count and content
    expect(retrieved.ingredients.length).toBe(input.ingredients.length);
    for (let i = 0; i < input.ingredients.length; i++) {
      const inputIng = input.ingredients[i]!;
      const retrievedIng = retrieved.ingredients[i]!;
      
      expect(retrievedIng.name).toBe(inputIng.name);
      expect(retrievedIng.quantity).toBeCloseTo(inputIng.quantity, 5);
      expect(retrievedIng.unit).toBe(inputIng.unit);
      expect(retrievedIng.notes).toBe(inputIng.notes);
      expect(retrievedIng.category).toBe(inputIng.category);
    }

    // Instructions count and content
    expect(retrieved.instructions.length).toBe(input.instructions.length);
    for (let i = 0; i < input.instructions.length; i++) {
      const inputInst = input.instructions[i]!;
      const retrievedInst = retrieved.instructions[i]!;
      
      expect(retrievedInst.text).toBe(inputInst.text);
      expect(retrievedInst.step).toBe(i + 1);
      
      if (inputInst.durationMinutes !== undefined) {
        expect(retrievedInst.duration?.minutes).toBe(inputInst.durationMinutes);
      } else {
        expect(retrievedInst.duration).toBeUndefined();
      }
      
      expect(retrievedInst.notes).toBe(inputInst.notes);
    }

    // Tags
    const inputTags = input.tags ?? [];
    expect(retrieved.tags.sort()).toEqual([...new Set(inputTags)].sort());
  }

  it('should preserve all recipe data through store and retrieve cycle', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Store the recipe
        const created = repo.createRecipe(recipeInput);
        
        // Retrieve the recipe
        const retrieved = repo.getRecipe(created.id);
        
        // Verify it exists
        expect(retrieved).toBeDefined();
        
        // Verify all fields are preserved
        assertRecipeEquivalent(recipeInput, retrieved!);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve recipe data after multiple store operations', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 10 }),
        (recipeInputs) => {
          // Store all recipes
          const createdRecipes = recipeInputs.map(input => repo.createRecipe(input));
          
          // Retrieve and verify each recipe
          for (let i = 0; i < recipeInputs.length; i++) {
            const retrieved = repo.getRecipe(createdRecipes[i]!.id);
            expect(retrieved).toBeDefined();
            assertRecipeEquivalent(recipeInputs[i]!, retrieved!);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
