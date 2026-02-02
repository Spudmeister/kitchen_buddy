/**
 * Property-based tests for Multiple Photos Per Recipe
 *
 * **Property 35: Multiple Photos Per Recipe**
 * *For any* recipe, adding N photos SHALL result in exactly N photos
 * being retrievable for that recipe, organized by cook session.
 *
 * **Validates: Requirements 17.1, 17.5**
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

describe('Property 35: Multiple Photos Per Recipe', () => {
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
   * Feature: sous-chef, Property 35: Multiple Photos Per Recipe
   * Adding N photos should result in exactly N photos retrievable
   */
  it('should store and retrieve exactly N photos when N photos are added', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.array(photoInputArb, { minLength: 1, maxLength: 10 }),
        async (recipeInput, photoInputs) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Add all photos
          const addedPhotos = photoInputs.map((input, index) => {
            // Make filenames unique
            const uniqueInput = {
              ...input,
              filename: `photo_${index}_${input.filename}`,
            };
            return photoService.addPhoto(recipe.id, uniqueInput);
          });

          // Verify count
          expect(addedPhotos.length).toBe(photoInputs.length);

          // Retrieve all photos
          const retrievedPhotos = photoService.getPhotos(recipe.id);
          expect(retrievedPhotos.length).toBe(photoInputs.length);

          // Verify photo count method
          const count = photoService.getPhotoCount(recipe.id);
          expect(count).toBe(photoInputs.length);

          // Verify each photo can be retrieved individually
          for (const photo of addedPhotos) {
            const retrieved = photoService.getPhoto(photo.id);
            expect(retrieved).toBeDefined();
            expect(retrieved!.recipeId).toBe(recipe.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 35: Multiple Photos Per Recipe
   * Photos should be organized by cook session (instance)
   */
  it('should organize photos by cook session when grouped', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.array(photoInputArb, { minLength: 2, maxLength: 5 }),
        fc.array(photoInputArb, { minLength: 2, maxLength: 5 }),
        async (recipeInput, session1Photos, session2Photos) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create two instances (cook sessions)
          const instance1 = instanceService.createInstance(recipe.id, { notes: 'Session 1' });
          const instance2 = instanceService.createInstance(recipe.id, { notes: 'Session 2' });

          // Add photos to first session
          const addedSession1 = session1Photos.map((input, index) => {
            const uniqueInput = {
              ...input,
              filename: `s1_${index}_${input.filename}`,
              instanceId: instance1.id,
            };
            return photoService.addPhoto(recipe.id, uniqueInput);
          });

          // Add photos to second session
          const addedSession2 = session2Photos.map((input, index) => {
            const uniqueInput = {
              ...input,
              filename: `s2_${index}_${input.filename}`,
              instanceId: instance2.id,
            };
            return photoService.addPhoto(recipe.id, uniqueInput);
          });

          // Get photos grouped by instance
          const grouped = photoService.getPhotosGroupedByInstance(recipe.id);

          // Verify grouping
          expect(grouped.get(instance1.id)?.length).toBe(session1Photos.length);
          expect(grouped.get(instance2.id)?.length).toBe(session2Photos.length);

          // Verify total count
          const allPhotos = photoService.getPhotos(recipe.id);
          expect(allPhotos.length).toBe(session1Photos.length + session2Photos.length);

          // Verify getPhotosByInstance
          const instance1Photos = photoService.getPhotosByInstance(instance1.id);
          expect(instance1Photos.length).toBe(session1Photos.length);

          const instance2Photos = photoService.getPhotosByInstance(instance2.id);
          expect(instance2Photos.length).toBe(session2Photos.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 35: Multiple Photos Per Recipe
   * Deleting a photo should reduce count by exactly 1
   */
  it('should reduce photo count by 1 when a photo is deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.array(photoInputArb, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        async (recipeInput, photoInputs, deleteIndex) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Add all photos
          const addedPhotos = photoInputs.map((input, index) => {
            const uniqueInput = {
              ...input,
              filename: `photo_${index}_${input.filename}`,
            };
            return photoService.addPhoto(recipe.id, uniqueInput);
          });

          const initialCount = photoService.getPhotoCount(recipe.id);
          expect(initialCount).toBe(photoInputs.length);

          // Delete one photo (use modulo to ensure valid index)
          const indexToDelete = deleteIndex % addedPhotos.length;
          const photoToDelete = addedPhotos[indexToDelete];
          photoService.deletePhoto(photoToDelete.id);

          // Verify count decreased by 1
          const newCount = photoService.getPhotoCount(recipe.id);
          expect(newCount).toBe(initialCount - 1);

          // Verify the deleted photo is no longer retrievable
          const deletedPhoto = photoService.getPhoto(photoToDelete.id);
          expect(deletedPhoto).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 35: Multiple Photos Per Recipe
   * Photos without instance should be grouped under null key
   */
  it('should group photos without instance under null key', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.array(photoInputArb, { minLength: 1, maxLength: 5 }),
        async (recipeInput, photoInputs) => {
          // Create a recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Add photos without instance
          photoInputs.forEach((input, index) => {
            const uniqueInput = {
              ...input,
              filename: `photo_${index}_${input.filename}`,
              instanceId: undefined,
            };
            photoService.addPhoto(recipe.id, uniqueInput);
          });

          // Get photos grouped by instance
          const grouped = photoService.getPhotosGroupedByInstance(recipe.id);

          // Photos without instance should be under null key
          const unassociatedPhotos = grouped.get(null);
          expect(unassociatedPhotos).toBeDefined();
          expect(unassociatedPhotos!.length).toBe(photoInputs.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
