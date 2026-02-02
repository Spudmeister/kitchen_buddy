/**
 * Property-based tests for Photo Format Support
 *
 * **Property 34: Photo Format Support**
 * *For any* photo in a supported format (JPEG, PNG, HEIC, HEIF),
 * the Photo_Manager SHALL successfully store and retrieve the photo with correct metadata.
 *
 * **Validates: Requirements 17.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { PhotoService } from '../../src/services/photo-service.js';
import {
  minimalRecipeInputArb,
  photoInputArb,
  photoInputWithFormatArb,
  supportedImageFormatArb,
  unsupportedImageFormatArb,
  photoFilenameArb,
} from '../generators/recipe-generators.js';
import type { SupportedImageFormat } from '../../src/types/photo.js';

describe('Property 34: Photo Format Support', () => {
  let db: Database;
  let recipeService: RecipeService;
  let photoService: PhotoService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    photoService = new PhotoService(db);
  });

  /**
   * Feature: sous-chef, Property 34: Photo Format Support
   * For any supported format, photos should be stored and retrieved successfully
   */
  it('should store and retrieve photos in any supported format', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        supportedImageFormatArb,
        photoFilenameArb,
        async (recipeInput, format, filename) => {
          // Create a recipe first
          const recipe = recipeService.createRecipe(recipeInput);

          // Create photo input with the specific format
          const photoInput = {
            data: 'test-photo-data-base64',
            filename,
            mimeType: format,
            width: 800,
            height: 600,
          };

          // Add the photo
          const photo = photoService.addPhoto(recipe.id, photoInput);

          // Verify photo was stored
          expect(photo).toBeDefined();
          expect(photo.id).toBeDefined();
          expect(photo.recipeId).toBe(recipe.id);
          expect(photo.mimeType).toBe(format);
          expect(photo.filename).toBe(filename);
          expect(photo.width).toBe(800);
          expect(photo.height).toBe(600);

          // Retrieve the photo
          const retrieved = photoService.getPhoto(photo.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.id).toBe(photo.id);
          expect(retrieved!.mimeType).toBe(format);
          expect(retrieved!.filename).toBe(filename);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 34: Photo Format Support
   * All four supported formats should work correctly
   */
  it('should support all four required formats: JPEG, PNG, HEIC, HEIF', async () => {
    const formats: SupportedImageFormat[] = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

    await fc.assert(
      fc.asyncProperty(minimalRecipeInputArb, async (recipeInput) => {
        const recipe = recipeService.createRecipe(recipeInput);

        for (const format of formats) {
          const photoInput = {
            data: `test-data-${format}`,
            filename: `test-${format.split('/')[1]}.${format.split('/')[1]}`,
            mimeType: format,
          };

          const photo = photoService.addPhoto(recipe.id, photoInput);
          expect(photo.mimeType).toBe(format);

          const retrieved = photoService.getPhoto(photo.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.mimeType).toBe(format);
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 34: Photo Format Support
   * Photo metadata should be preserved correctly
   */
  it('should preserve photo metadata correctly', async () => {
    await fc.assert(
      fc.asyncProperty(minimalRecipeInputArb, photoInputArb, async (recipeInput, photoInput) => {
        const recipe = recipeService.createRecipe(recipeInput);
        const photo = photoService.addPhoto(recipe.id, photoInput);

        // Verify metadata is preserved
        expect(photo.filename).toBe(photoInput.filename);
        expect(photo.mimeType).toBe(photoInput.mimeType);

        if (photoInput.width !== undefined) {
          expect(photo.width).toBe(photoInput.width);
        }
        if (photoInput.height !== undefined) {
          expect(photo.height).toBe(photoInput.height);
        }
        if (photoInput.metadata?.caption !== undefined) {
          expect(photo.metadata.caption).toBe(photoInput.metadata.caption);
        }
        if (photoInput.metadata?.step !== undefined) {
          expect(photo.metadata.step).toBe(photoInput.metadata.step);
        }

        // Retrieve and verify again
        const retrieved = photoService.getPhoto(photo.id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.filename).toBe(photoInput.filename);
        expect(retrieved!.mimeType).toBe(photoInput.mimeType);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 34: Photo Format Support
   * Unsupported formats should be rejected
   */
  it('should reject unsupported image formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        unsupportedImageFormatArb,
        async (recipeInput, unsupportedFormat) => {
          const recipe = recipeService.createRecipe(recipeInput);

          const photoInput = {
            data: 'test-data',
            filename: 'test.gif',
            mimeType: unsupportedFormat as any,
          };

          expect(() => photoService.addPhoto(recipe.id, photoInput)).toThrow(
            /Unsupported image format/
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 34: Photo Format Support
   * isSupportedFormat should correctly identify supported formats
   */
  it('should correctly identify supported formats', () => {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    const unsupportedFormats = ['image/gif', 'image/bmp', 'image/webp', 'application/pdf'];

    for (const format of supportedFormats) {
      expect(photoService.isSupportedFormat(format)).toBe(true);
    }

    for (const format of unsupportedFormats) {
      expect(photoService.isSupportedFormat(format)).toBe(false);
    }
  });
});
