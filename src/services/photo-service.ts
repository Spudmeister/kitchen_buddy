/**
 * Photo Service - Manages recipe photos
 *
 * Requirements: 17.1, 17.4 - Store multiple photos per recipe, support common formats
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type {
  Photo,
  PhotoInput,
  PhotoMetadata,
  SupportedImageFormat,
  SUPPORTED_IMAGE_FORMATS,
} from '../types/photo.js';

/**
 * Service for managing recipe photos
 */
export class PhotoService {
  constructor(private db: Database) {}

  /**
   * Check if a MIME type is supported
   * Requirements: 17.4 - Support JPEG, PNG, HEIC, HEIF formats
   */
  isSupportedFormat(mimeType: string): mimeType is SupportedImageFormat {
    return ['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(mimeType);
  }

  /**
   * Get list of supported formats
   */
  getSupportedFormats(): SupportedImageFormat[] {
    return ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
  }

  /**
   * Add a photo to a recipe
   * Requirements: 17.1 - Store multiple photos per recipe
   */
  addPhoto(recipeId: string, input: PhotoInput): Photo {
    // Validate format
    if (!this.isSupportedFormat(input.mimeType)) {
      throw new Error(
        `Unsupported image format: ${input.mimeType}. Supported formats: ${this.getSupportedFormats().join(', ')}`
      );
    }

    // Verify recipe exists
    const recipeExists = this.db.get<[number]>(
      'SELECT 1 FROM recipes WHERE id = ?',
      [recipeId]
    );
    if (!recipeExists) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    // If instance ID provided, verify it exists and belongs to this recipe
    if (input.instanceId) {
      const instanceExists = this.db.get<[string]>(
        'SELECT recipe_id FROM recipe_instances WHERE id = ?',
        [input.instanceId]
      );
      if (!instanceExists) {
        throw new Error(`Recipe instance not found: ${input.instanceId}`);
      }
      if (instanceExists[0] !== recipeId) {
        throw new Error(`Instance ${input.instanceId} does not belong to recipe ${recipeId}`);
      }
    }

    const photoId = uuidv4();
    const now = new Date().toISOString();
    
    // Generate a file path (in a real app, this would be a real file system path)
    const filePath = `photos/${recipeId}/${photoId}_${input.filename}`;

    // Store photo data (in a real app, this would write to file system)
    // For now, we store the path reference in the database
    
    this.db.run(
      `INSERT INTO photos (id, recipe_id, instance_id, filename, mime_type, width, height, file_path, taken_at, caption, step_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photoId,
        recipeId,
        input.instanceId ?? null,
        input.filename,
        input.mimeType,
        input.width ?? null,
        input.height ?? null,
        filePath,
        input.takenAt?.toISOString() ?? null,
        input.metadata?.caption ?? null,
        input.metadata?.step ?? null,
        now,
      ]
    );

    return this.getPhoto(photoId)!;
  }

  /**
   * Get a photo by ID
   */
  getPhoto(id: string): Photo | undefined {
    const row = this.db.get<[
      string, string, string | null, string, string, number | null, number | null,
      string, string | null, string | null, number | null, string
    ]>(
      `SELECT id, recipe_id, instance_id, filename, mime_type, width, height, 
              file_path, taken_at, caption, step_number, created_at
       FROM photos WHERE id = ?`,
      [id]
    );

    if (!row) {
      return undefined;
    }

    return this.rowToPhoto(row);
  }

  /**
   * Get all photos for a recipe
   * Requirements: 17.1 - Store multiple photos per recipe
   */
  getPhotos(recipeId: string): Photo[] {
    const rows = this.db.exec(
      `SELECT id, recipe_id, instance_id, filename, mime_type, width, height,
              file_path, taken_at, caption, step_number, created_at
       FROM photos WHERE recipe_id = ? ORDER BY created_at ASC`,
      [recipeId]
    );

    return rows.map(row => this.rowToPhoto(row as [
      string, string, string | null, string, string, number | null, number | null,
      string, string | null, string | null, number | null, string
    ]));
  }

  /**
   * Get photos for a specific recipe instance
   * Requirements: 17.2 - Store metadata including associated recipe instance
   */
  getPhotosByInstance(instanceId: string): Photo[] {
    const rows = this.db.exec(
      `SELECT id, recipe_id, instance_id, filename, mime_type, width, height,
              file_path, taken_at, caption, step_number, created_at
       FROM photos WHERE instance_id = ? ORDER BY created_at ASC`,
      [instanceId]
    );

    return rows.map(row => this.rowToPhoto(row as [
      string, string, string | null, string, string, number | null, number | null,
      string, string | null, string | null, number | null, string
    ]));
  }

  /**
   * Delete a photo
   */
  deletePhoto(id: string): void {
    const result = this.db.run('DELETE FROM photos WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error(`Photo not found: ${id}`);
    }
    // In a real app, we would also delete the file from the file system
  }

  /**
   * Update photo metadata
   */
  updatePhotoMetadata(id: string, metadata: PhotoMetadata): Photo {
    const result = this.db.run(
      `UPDATE photos SET caption = ?, step_number = ? WHERE id = ?`,
      [metadata.caption ?? null, metadata.step ?? null, id]
    );

    if (result.changes === 0) {
      throw new Error(`Photo not found: ${id}`);
    }

    return this.getPhoto(id)!;
  }

  /**
   * Get the count of photos for a recipe
   */
  getPhotoCount(recipeId: string): number {
    const row = this.db.get<[number]>(
      'SELECT COUNT(*) FROM photos WHERE recipe_id = ?',
      [recipeId]
    );
    return row?.[0] ?? 0;
  }

  /**
   * Get photos organized by instance (for displaying by cook session)
   * Requirements: 17.5 - Display photos organized by cook session
   */
  getPhotosGroupedByInstance(recipeId: string): Map<string | null, Photo[]> {
    const photos = this.getPhotos(recipeId);
    const grouped = new Map<string | null, Photo[]>();

    for (const photo of photos) {
      const key = photo.instanceId ?? null;
      const existing = grouped.get(key) ?? [];
      existing.push(photo);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * Get the instance ID from a photo
   * Requirements: 17.3 - Navigate from photo to exact recipe configuration
   */
  getInstanceIdFromPhoto(photoId: string): string | undefined {
    const photo = this.getPhoto(photoId);
    return photo?.instanceId;
  }

  /**
   * Associate a photo with an instance
   * Requirements: 17.2 - Store metadata including associated recipe instance
   */
  associatePhotoWithInstance(photoId: string, instanceId: string): Photo {
    // Verify photo exists
    const photo = this.getPhoto(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }

    // Verify instance exists
    const instanceExists = this.db.get<[string]>(
      'SELECT recipe_id FROM recipe_instances WHERE id = ?',
      [instanceId]
    );
    if (!instanceExists) {
      throw new Error(`Recipe instance not found: ${instanceId}`);
    }

    // Verify instance belongs to the same recipe
    if (instanceExists[0] !== photo.recipeId) {
      throw new Error(`Instance ${instanceId} does not belong to recipe ${photo.recipeId}`);
    }

    // Update the photo
    this.db.run('UPDATE photos SET instance_id = ? WHERE id = ?', [instanceId, photoId]);

    return this.getPhoto(photoId)!;
  }

  /**
   * Convert a database row to a Photo object
   */
  private rowToPhoto(row: [
    string, string, string | null, string, string, number | null, number | null,
    string, string | null, string | null, number | null, string
  ]): Photo {
    const [
      id, recipeId, instanceId, filename, mimeType, width, height,
      filePath, takenAt, caption, stepNumber, createdAt
    ] = row;

    const metadata: PhotoMetadata = {};
    if (caption !== null) metadata.caption = caption;
    if (stepNumber !== null) metadata.step = stepNumber;

    return {
      id,
      recipeId,
      instanceId: instanceId ?? undefined,
      filename,
      mimeType: mimeType as SupportedImageFormat,
      width: width ?? undefined,
      height: height ?? undefined,
      filePath,
      takenAt: takenAt ? new Date(takenAt) : undefined,
      metadata,
      createdAt: new Date(createdAt),
    };
  }
}
