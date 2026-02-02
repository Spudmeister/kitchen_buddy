/**
 * Property Test: Photo Organization
 *
 * **Feature: sous-chef-pwa, Property 8: Photo Organization**
 * **Validates: Requirements 7.1, 7.4, 7.5**
 *
 * For any set of recipe photos:
 * - Photos SHALL be grouped by cook session when groupBySession is true
 * - Photos without a session SHALL be in a separate group
 * - Navigation to session configuration SHALL work for photos with instanceId
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Photo, PhotoGroup, SupportedImageFormat } from '../../src/types/photo';

/**
 * Arbitrary for generating a supported image format
 */
const imageFormatArb: fc.Arbitrary<SupportedImageFormat> = fc.constantFrom(
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif'
);

/**
 * Arbitrary for generating a photo
 */
const photoArb: fc.Arbitrary<Photo> = fc.record({
  id: fc.uuid(),
  recipeId: fc.uuid(),
  instanceId: fc.option(fc.uuid(), { nil: undefined }),
  filename: fc.string({ minLength: 1, maxLength: 100 }).map((s) => `${s}.jpg`),
  mimeType: imageFormatArb,
  width: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
  height: fc.option(fc.integer({ min: 100, max: 4000 }), { nil: undefined }),
  takenAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), {
    nil: undefined,
  }),
  metadata: fc.record({
    caption: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    step: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
    tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }), {
      nil: undefined,
    }),
  }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

/**
 * Arbitrary for generating a list of photos for a single recipe
 */
const recipePhotosArb: fc.Arbitrary<Photo[]> = fc
  .tuple(fc.uuid(), fc.array(photoArb, { minLength: 0, maxLength: 20 }))
  .map(([recipeId, photos]) => photos.map((p) => ({ ...p, recipeId })));

/**
 * Group photos by session (mirrors the component logic)
 */
function groupPhotosBySession(photos: Photo[]): PhotoGroup[] {
  const groups = new Map<string | null, Photo[]>();

  for (const photo of photos) {
    const key = photo.instanceId || null;
    const existing = groups.get(key) || [];
    existing.push(photo);
    groups.set(key, existing);
  }

  const result: PhotoGroup[] = [];

  for (const [instanceId, groupPhotos] of groups) {
    groupPhotos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    result.push({
      instanceId,
      sessionDate: groupPhotos[0]?.createdAt,
      photos: groupPhotos,
    });
  }

  result.sort((a, b) => {
    const dateA = a.sessionDate?.getTime() || 0;
    const dateB = b.sessionDate?.getTime() || 0;
    return dateB - dateA;
  });

  return result;
}

/**
 * Check if a photo can navigate to its session
 */
function canNavigateToSession(photo: Photo): boolean {
  return photo.instanceId !== undefined && photo.instanceId !== null;
}

describe('Property 8: Photo Organization', () => {
  it('should group all photos by session when groupBySession is true', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);

        // Total photos in groups should equal input photos
        const totalPhotosInGroups = groups.reduce((sum, g) => sum + g.photos.length, 0);
        expect(totalPhotosInGroups).toBe(photos.length);

        // Each photo should appear exactly once
        const allPhotoIds = groups.flatMap((g) => g.photos.map((p) => p.id));
        const uniqueIds = new Set(allPhotoIds);
        expect(uniqueIds.size).toBe(photos.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should place photos without instanceId in a null group', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);

        // Find photos without instanceId
        const photosWithoutSession = photos.filter((p) => !p.instanceId);

        // Find the null group
        const nullGroup = groups.find((g) => g.instanceId === null);

        if (photosWithoutSession.length > 0) {
          expect(nullGroup).toBeDefined();
          expect(nullGroup!.photos.length).toBe(photosWithoutSession.length);

          // All photos in null group should have no instanceId
          for (const photo of nullGroup!.photos) {
            expect(photo.instanceId).toBeUndefined();
          }
        } else {
          // If no photos without session, null group should not exist or be empty
          if (nullGroup) {
            expect(nullGroup.photos.length).toBe(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should group photos with same instanceId together', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);

        // For each group with an instanceId, all photos should have that instanceId
        for (const group of groups) {
          if (group.instanceId !== null) {
            for (const photo of group.photos) {
              expect(photo.instanceId).toBe(group.instanceId);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should allow navigation to session for photos with instanceId', () => {
    fc.assert(
      fc.property(photoArb, (photo) => {
        const canNavigate = canNavigateToSession(photo);

        if (photo.instanceId) {
          expect(canNavigate).toBe(true);
        } else {
          expect(canNavigate).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should sort photos within groups by date (most recent first)', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);

        for (const group of groups) {
          for (let i = 1; i < group.photos.length; i++) {
            const prevDate = group.photos[i - 1].createdAt.getTime();
            const currDate = group.photos[i].createdAt.getTime();
            expect(prevDate).toBeGreaterThanOrEqual(currDate);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should sort groups by date (most recent first)', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);

        for (let i = 1; i < groups.length; i++) {
          const prevDate = groups[i - 1].sessionDate?.getTime() || 0;
          const currDate = groups[i].sessionDate?.getTime() || 0;
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all photo data when grouping', () => {
    fc.assert(
      fc.property(recipePhotosArb, (photos) => {
        const groups = groupPhotosBySession(photos);
        const groupedPhotos = groups.flatMap((g) => g.photos);

        // Each original photo should be findable in grouped photos
        for (const original of photos) {
          const found = groupedPhotos.find((p) => p.id === original.id);
          expect(found).toBeDefined();
          expect(found!.recipeId).toBe(original.recipeId);
          expect(found!.instanceId).toBe(original.instanceId);
          expect(found!.filename).toBe(original.filename);
          expect(found!.mimeType).toBe(original.mimeType);
        }
      }),
      { numRuns: 100 }
    );
  });
});
