/**
 * Property-based tests for Recipe Instance Configuration Snapshot
 *
 * **Property 33: Recipe Instance Configuration Snapshot**
 * *For any* recipe instance, loading it SHALL return the recipe with the exact
 * scale factor, unit system, and servings that were used, producing the same
 * ingredient quantities as when originally cooked.
 *
 * **Validates: Requirements 18.2, 18.3, 18.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { RecipeInstanceService } from '../../src/services/instance-service.js';
import { UnitConverter } from '../../src/services/unit-converter.js';
import {
  minimalRecipeInputArb,
  instanceConfigArb,
  unitSystemArb,
} from '../generators/recipe-generators.js';
import type { InstanceConfig } from '../../src/types/instance.js';

describe('Property 33: Recipe Instance Configuration Snapshot', () => {
  let db: Database;
  let recipeService: RecipeService;
  let instanceService: RecipeInstanceService;
  let unitConverter: UnitConverter;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    instanceService = new RecipeInstanceService(db);
    unitConverter = new UnitConverter();
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Loading an instance should return recipe with exact configuration
   */
  it('should preserve scale factor when loading instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.double({ min: 0.5, max: 4, noNaN: true }),
        async (recipeInput, scaleFactor) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance with specific scale factor
          const config: InstanceConfig = {
            scaleFactor,
            unitSystem: 'us',
            servings: Math.round(recipe.servings * scaleFactor),
          };
          const instance = instanceService.createInstance(recipe.id, config);

          // Verify instance was created with correct config
          expect(instance.scaleFactor).toBeCloseTo(scaleFactor, 5);
          expect(instance.unitSystem).toBe('us');

          // Retrieve the instance and verify config is preserved
          const retrieved = instanceService.getInstance(instance.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.scaleFactor).toBeCloseTo(scaleFactor, 5);
          expect(retrieved!.unitSystem).toBe('us');
          expect(retrieved!.servings).toBe(config.servings);

          // Load the instance as a recipe
          const loadedRecipe = instanceService.loadInstanceAsRecipe(instance.id);

          // Verify servings match
          expect(loadedRecipe.servings).toBe(config.servings);

          // Verify the loaded recipe has the same number of ingredients
          expect(loadedRecipe.ingredients.length).toBe(recipe.ingredients.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Instance should preserve unit system preference
   */
  it('should preserve unit system when loading instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        unitSystemArb,
        async (recipeInput, unitSystem) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance with specific unit system
          const config: InstanceConfig = {
            scaleFactor: 1.0,
            unitSystem,
            servings: recipe.servings,
          };
          const instance = instanceService.createInstance(recipe.id, config);

          // Verify instance was created with correct unit system
          expect(instance.unitSystem).toBe(unitSystem);

          // Retrieve the instance
          const retrieved = instanceService.getInstance(instance.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.unitSystem).toBe(unitSystem);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Instance should preserve servings count
   */
  it('should preserve servings count when loading instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 20 }),
        async (recipeInput, servings) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance with specific servings
          const config: InstanceConfig = {
            scaleFactor: 1.0,
            unitSystem: 'us',
            servings,
          };
          const instance = instanceService.createInstance(recipe.id, config);

          // Verify instance was created with correct servings
          expect(instance.servings).toBe(servings);

          // Load the instance as a recipe
          const loadedRecipe = instanceService.loadInstanceAsRecipe(instance.id);
          expect(loadedRecipe.servings).toBe(servings);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Instance should preserve notes
   */
  it('should preserve notes when loading instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        async (recipeInput, notes) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance with notes
          const config: InstanceConfig = {
            scaleFactor: 1.0,
            unitSystem: 'us',
            servings: recipe.servings,
            notes,
          };
          const instance = instanceService.createInstance(recipe.id, config);

          // Verify notes are preserved
          expect(instance.notes).toBe(notes);

          // Retrieve the instance
          const retrieved = instanceService.getInstance(instance.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.notes).toBe(notes);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Multiple instances for same recipe should be independent
   */
  it('should maintain independent configurations for multiple instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        instanceConfigArb,
        instanceConfigArb,
        async (recipeInput, config1, config2) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create two instances with different configs
          const instance1 = instanceService.createInstance(recipe.id, config1);
          const instance2 = instanceService.createInstance(recipe.id, config2);

          // Verify they are different instances
          expect(instance1.id).not.toBe(instance2.id);

          // Verify each has its own configuration
          const retrieved1 = instanceService.getInstance(instance1.id);
          const retrieved2 = instanceService.getInstance(instance2.id);

          expect(retrieved1).toBeDefined();
          expect(retrieved2).toBeDefined();

          // Verify configurations are preserved independently
          if (config1.scaleFactor !== undefined) {
            expect(retrieved1!.scaleFactor).toBeCloseTo(config1.scaleFactor, 5);
          }
          if (config2.scaleFactor !== undefined) {
            expect(retrieved2!.scaleFactor).toBeCloseTo(config2.scaleFactor, 5);
          }

          // Verify getInstancesForRecipe returns both
          const allInstances = instanceService.getInstancesForRecipe(recipe.id);
          expect(allInstances.length).toBe(2);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 33: Recipe Instance Configuration Snapshot
   * Instance should capture recipe version at creation time
   */
  it('should capture recipe version at instance creation', async () => {
    await fc.assert(
      fc.asyncProperty(minimalRecipeInputArb, async (recipeInput) => {
        // Create a recipe
        const recipe = recipeService.createRecipe(recipeInput);
        const originalVersion = recipe.currentVersion;

        // Create an instance
        const instance = instanceService.createInstance(recipe.id, {});

        // Verify instance captured the version
        expect(instance.recipeVersion).toBe(originalVersion);

        // Update the recipe
        const updatedRecipe = recipeService.updateRecipe(recipe.id, {
          ...recipeInput,
          title: recipeInput.title + ' (Updated)',
        });

        // Verify recipe version increased
        expect(updatedRecipe.currentVersion).toBe(originalVersion + 1);

        // Verify instance still references original version
        const retrievedInstance = instanceService.getInstance(instance.id);
        expect(retrievedInstance!.recipeVersion).toBe(originalVersion);
      }),
      { numRuns: 50 }
    );
  });
});
