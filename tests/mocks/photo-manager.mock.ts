/**
 * Mock Photo Manager for Sous Chef Testing
 * 
 * Provides virtual file system for photo tests.
 * Simulates photo storage without actual file I/O.
 * 
 * Requirements: Design - Testing Strategy
 */

import type {
  Photo,
  PhotoInput,
  PhotoMetadata,
  SupportedImageFormat,
} from '../../src/types/photo.js';
import type { RecipeInstance } from '../../src/types/instance.js';

/**
 * Virtual photo storage entry
 */
interface VirtualPhoto {
  id: string;
  recipeId: string;
  instanceId?: string;
  filename: string;
  mimeType: SupportedImageFormat;
  width?: number;
  height?: number;
  data: string | Uint8Array;
  takenAt?: Date;
  metadata: PhotoMetadata;
  createdAt: Date;
}

/**
 * Mock Photo Manager for testing
 * 
 * Provides a virtual file system for photo operations:
 * - Stores photos in memory
 * - Tracks all operations for verification
 * - Supports format validation
 */
export class MockPhotoManager {
  private photos: Map<string, VirtualPhoto> = new Map();
  private photosByRecipe: Map<string, string[]> = new Map();
  private photosByInstance: Map<string, string[]> = new Map();
  private callHistory: Array<{ method: string; args: unknown[] }> = [];
  private nextId: number = 1;
  private shouldFail: boolean = false;
  private failureMessage: string = 'Mock failure';

  /**
   * Supported image formats
   */
  private readonly supportedFormats: SupportedImageFormat[] = [
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
  ];

  /**
   * Configure the mock to fail operations
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  /**
   * Get call history for verification
   */
  getCallHistory(): Array<{ method: string; args: unknown[] }> {
    return [...this.callHistory];
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset the mock to initial state
   */
  reset(): void {
    this.photos.clear();
    this.photosByRecipe.clear();
    this.photosByInstance.clear();
    this.callHistory = [];
    this.nextId = 1;
    this.shouldFail = false;
    this.failureMessage = 'Mock failure';
  }

  /**
   * Get all stored photos (for debugging)
   */
  getAllPhotos(): VirtualPhoto[] {
    return Array.from(this.photos.values());
  }

  /**
   * Get photo count
   */
  getPhotoCount(): number {
    return this.photos.size;
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(mimeType: string): boolean {
    return this.supportedFormats.includes(mimeType as SupportedImageFormat);
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): SupportedImageFormat[] {
    return [...this.supportedFormats];
  }

  /**
   * Add a photo to a recipe
   */
  async addPhoto(recipeId: string, input: PhotoInput): Promise<Photo> {
    this.callHistory.push({ method: 'addPhoto', args: [recipeId, input] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    // Validate format
    if (!this.isFormatSupported(input.mimeType)) {
      throw new Error(`Unsupported image format: ${input.mimeType}`);
    }

    const id = `photo-${this.nextId++}`;
    const now = new Date();

    const virtualPhoto: VirtualPhoto = {
      id,
      recipeId,
      instanceId: input.instanceId,
      filename: input.filename,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      data: input.data,
      takenAt: input.takenAt,
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    this.photos.set(id, virtualPhoto);

    // Index by recipe
    const recipePhotos = this.photosByRecipe.get(recipeId) ?? [];
    recipePhotos.push(id);
    this.photosByRecipe.set(recipeId, recipePhotos);

    // Index by instance if provided
    if (input.instanceId) {
      const instancePhotos = this.photosByInstance.get(input.instanceId) ?? [];
      instancePhotos.push(id);
      this.photosByInstance.set(input.instanceId, instancePhotos);
    }

    return this.toPhoto(virtualPhoto);
  }

  /**
   * Get all photos for a recipe
   */
  async getPhotos(recipeId: string): Promise<Photo[]> {
    this.callHistory.push({ method: 'getPhotos', args: [recipeId] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const photoIds = this.photosByRecipe.get(recipeId) ?? [];
    return photoIds
      .map(id => this.photos.get(id))
      .filter((p): p is VirtualPhoto => p !== undefined)
      .map(p => this.toPhoto(p));
  }

  /**
   * Get photos by instance
   */
  async getPhotosByInstance(instanceId: string): Promise<Photo[]> {
    this.callHistory.push({ method: 'getPhotosByInstance', args: [instanceId] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const photoIds = this.photosByInstance.get(instanceId) ?? [];
    return photoIds
      .map(id => this.photos.get(id))
      .filter((p): p is VirtualPhoto => p !== undefined)
      .map(p => this.toPhoto(p));
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    this.callHistory.push({ method: 'deletePhoto', args: [photoId] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }

    // Remove from indexes
    const recipePhotos = this.photosByRecipe.get(photo.recipeId);
    if (recipePhotos) {
      const index = recipePhotos.indexOf(photoId);
      if (index !== -1) {
        recipePhotos.splice(index, 1);
      }
    }

    if (photo.instanceId) {
      const instancePhotos = this.photosByInstance.get(photo.instanceId);
      if (instancePhotos) {
        const index = instancePhotos.indexOf(photoId);
        if (index !== -1) {
          instancePhotos.splice(index, 1);
        }
      }
    }

    this.photos.delete(photoId);
  }

  /**
   * Update photo metadata
   */
  async updatePhotoMetadata(photoId: string, metadata: PhotoMetadata): Promise<void> {
    this.callHistory.push({ method: 'updatePhotoMetadata', args: [photoId, metadata] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }

    photo.metadata = { ...photo.metadata, ...metadata };
  }

  /**
   * Get instance from photo (mock implementation)
   */
  async getInstanceFromPhoto(photoId: string): Promise<RecipeInstance | null> {
    this.callHistory.push({ method: 'getInstanceFromPhoto', args: [photoId] });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const photo = this.photos.get(photoId);
    if (!photo || !photo.instanceId) {
      return null;
    }

    // Return a mock instance
    return {
      id: photo.instanceId,
      recipeId: photo.recipeId,
      recipeVersion: 1,
      scaleFactor: 1.0,
      unitSystem: 'us',
      servings: 4,
      modifications: [],
      photoIds: [photoId],
      createdAt: photo.createdAt,
    };
  }

  /**
   * Convert virtual photo to Photo type
   */
  private toPhoto(virtual: VirtualPhoto): Photo {
    return {
      id: virtual.id,
      recipeId: virtual.recipeId,
      instanceId: virtual.instanceId,
      filename: virtual.filename,
      mimeType: virtual.mimeType,
      width: virtual.width,
      height: virtual.height,
      filePath: `/mock/photos/${virtual.id}/${virtual.filename}`,
      takenAt: virtual.takenAt,
      metadata: virtual.metadata,
      createdAt: virtual.createdAt,
    };
  }
}

/**
 * Create a fresh mock photo manager
 */
export function createMockPhotoManager(): MockPhotoManager {
  return new MockPhotoManager();
}

/**
 * Create a mock photo manager with pre-loaded photos
 */
export async function createPhotoManagerWithPhotos(
  photos: Array<{ recipeId: string; input: PhotoInput }>
): Promise<{
  manager: MockPhotoManager;
  photoIds: string[];
}> {
  const manager = new MockPhotoManager();
  const photoIds: string[] = [];

  for (const { recipeId, input } of photos) {
    const photo = await manager.addPhoto(recipeId, input);
    photoIds.push(photo.id);
  }

  return { manager, photoIds };
}

/**
 * Sample photo inputs for testing
 */
export const samplePhotoInputs = {
  /** JPEG photo */
  jpeg: {
    data: 'mock-jpeg-data-base64',
    filename: 'photo.jpg',
    mimeType: 'image/jpeg' as SupportedImageFormat,
    width: 1920,
    height: 1080,
  } as PhotoInput,

  /** PNG photo */
  png: {
    data: 'mock-png-data-base64',
    filename: 'photo.png',
    mimeType: 'image/png' as SupportedImageFormat,
    width: 800,
    height: 600,
  } as PhotoInput,

  /** HEIC photo (iOS) */
  heic: {
    data: 'mock-heic-data-base64',
    filename: 'photo.heic',
    mimeType: 'image/heic' as SupportedImageFormat,
    width: 4032,
    height: 3024,
  } as PhotoInput,

  /** HEIF photo */
  heif: {
    data: 'mock-heif-data-base64',
    filename: 'photo.heif',
    mimeType: 'image/heif' as SupportedImageFormat,
    width: 4032,
    height: 3024,
  } as PhotoInput,

  /** Photo with metadata */
  withMetadata: {
    data: 'mock-data-with-metadata',
    filename: 'step-photo.jpg',
    mimeType: 'image/jpeg' as SupportedImageFormat,
    width: 1920,
    height: 1080,
    metadata: {
      caption: 'Finished dish',
      step: 5,
      tags: ['plated', 'final'],
    },
    takenAt: new Date(),
  } as PhotoInput,

  /** Photo with instance */
  withInstance: (instanceId: string): PhotoInput => ({
    data: 'mock-instance-photo-data',
    filename: 'cook-session.jpg',
    mimeType: 'image/jpeg' as SupportedImageFormat,
    width: 1920,
    height: 1080,
    instanceId,
    metadata: {
      caption: 'During cooking',
    },
  }),
};
