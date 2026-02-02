/**
 * Property-based tests for Photo-Instance Association
 *
 * **Property 32: Photo-Instance Association**
 * *For any* photo added during a cook session, the photo SHALL be associated
 * with the correct recipe instance, and navigating from the photo SHALL return
 * the exact configuration (scale, units, notes) used.
 *
 * **Validates: Requirements 17.2, 17.3, 18.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { PhotoService } from '../../src/services/photo-service.js';
import { RecipeInstanceService } from '../../src/services/instance-service.js';
import {
  minimalRecipeInputArb,
  photoInputArb,
  instanceConfigArb,
} from '../generators/recipe-generators.js';

describe('Property 32: Photo-Instance Association', () => {
  let db: Database;
  let recipeService: RecipeService;
  let photoService: PhotoService;
  let instanceService: RecipeInstanceService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    photoService = new PhotoService(db);
    instanceService = new RecipeInstanceService(db);
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Photos added with instance ID should be associated with that instance
   */
  it('should associate photo with correct instance when added', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        instanceConfigArb,
        photoInputArb,
        async (recipeInput, instanceConfig, photoInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance
          const instance = instanceService.createInstance(recipe.id, instanceConfig);

          // Add a photo with the instance ID
          const photoWithInstance = {
            ...photoInput,
            instanceId: instance.id,
          };
          const photo = photoService.addPhoto(recipe.id, photoWithInstance);

          // Verify photo is associated with the instance
          expect(photo.instanceId).toBe(instance.id);

          // Verify we can retrieve the photo by instance
          const instancePhotos = photoService.getPhotosByInstance(instance.id);
          expect(instancePhotos.length).toBe(1);
          expect(instancePhotos[0].id).toBe(photo.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Navigating from photo should return exact instance configuration
   */
  it('should return exact configuration when navigating from photo', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        instanceConfigArb,
        photoInputArb,
        async (recipeInput, instanceConfig, photoInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance with specific configuration
          const instance = instanceService.createInstance(recipe.id, instanceConfig);

          // Add a photo with the instance ID
          const photoWithInstance = {
            ...photoInput,
            instanceId: instance.id,
          };
          const photo = photoService.addPhoto(recipe.id, photoWithInstance);

          // Navigate from photo to instance
          const retrievedInstance = instanceService.getInstanceFromPhoto(photo.id);

          // Verify we got the correct instance
          expect(retrievedInstance).toBeDefined();
          expect(retrievedInstance!.id).toBe(instance.id);

          // Verify configuration is preserved
          if (instanceConfig.scaleFactor !== undefined) {
            expect(retrievedInstance!.scaleFactor).toBeCloseTo(instanceConfig.scaleFactor, 5);
          }
          if (instanceConfig.unitSystem !== undefined) {
            expect(retrievedInstance!.unitSystem).toBe(instanceConfig.unitSystem);
          }
          if (instanceConfig.servings !== undefined) {
            expect(retrievedInstance!.servings).toBe(instanceConfig.servings);
          }
          if (instanceConfig.notes !== undefined) {
            expect(retrievedInstance!.notes).toBe(instanceConfig.notes);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Photos without instance should return undefined when navigating
   */
  it('should return undefined when photo has no instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        photoInputArb,
        async (recipeInput, photoInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Add a photo without instance
          const photoWithoutInstance = {
            ...photoInput,
            instanceId: undefined,
          };
          const photo = photoService.addPhoto(recipe.id, photoWithoutInstance);

          // Navigate from photo should return undefined
          const retrievedInstance = instanceService.getInstanceFromPhoto(photo.id);
          expect(retrievedInstance).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Associating photo with instance after creation should work
   */
  it('should allow associating photo with instance after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        instanceConfigArb,
        photoInputArb,
        async (recipeInput, instanceConfig, photoInput) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance
          const instance = instanceService.createInstance(recipe.id, instanceConfig);

          // Add a photo without instance
          const photoWithoutInstance = {
            ...photoInput,
            instanceId: undefined,
          };
          const photo = photoService.addPhoto(recipe.id, photoWithoutInstance);

          // Verify photo has no instance
          expect(photo.instanceId).toBeUndefined();

          // Associate photo with instance
          const updatedPhoto = photoService.associatePhotoWithInstance(photo.id, instance.id);

          // Verify association
          expect(updatedPhoto.instanceId).toBe(instance.id);

          // Verify navigation works
          const retrievedInstance = instanceService.getInstanceFromPhoto(photo.id);
          expect(retrievedInstance).toBeDefined();
          expect(retrievedInstance!.id).toBe(instance.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Instance photo IDs should include associated photos
   */
  it('should include photo IDs in instance', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        instanceConfigArb,
        fc.array(photoInputArb, { minLength: 1, maxLength: 5 }),
        async (recipeInput, instanceConfig, photoInputs) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create an instance
          const instance = instanceService.createInstance(recipe.id, instanceConfig);

          // Add photos with the instance ID
          const addedPhotos = photoInputs.map((input, index) => {
            const photoWithInstance = {
              ...input,
              filename: `photo_${index}_${input.filename}`,
              instanceId: instance.id,
            };
            return photoService.addPhoto(recipe.id, photoWithInstance);
          });

          // Retrieve the instance
          const retrievedInstance = instanceService.getInstance(instance.id);

          // Verify photo IDs are included
          expect(retrievedInstance).toBeDefined();
          expect(retrievedInstance!.photoIds.length).toBe(addedPhotos.length);

          // Verify all photo IDs are present
          for (const photo of addedPhotos) {
            expect(retrievedInstance!.photoIds).toContain(photo.id);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 32: Photo-Instance Association
   * Should reject associating photo with instance from different recipe
   */
  it('should reject associating photo with instance from different recipe', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        minimalRecipeInputArb,
        instanceConfigArb,
        photoInputArb,
        async (recipeInput1, recipeInput2, instanceConfig, photoInput) => {
          // Create two recipes
          const recipe1 = recipeService.createRecipe(recipeInput1);
          const recipe2 = recipeService.createRecipe(recipeInput2);

          // Create an instance for recipe2
          const instance = instanceService.createInstance(recipe2.id, instanceConfig);

          // Add a photo to recipe1
          const photo = photoService.addPhoto(recipe1.id, photoInput);

          // Try to associate photo with instance from different recipe
          expect(() => {
            photoService.associatePhotoWithInstance(photo.id, instance.id);
          }).toThrow(/does not belong to recipe/);
        }
      ),
      { numRuns: 50 }
    );
  });
});
