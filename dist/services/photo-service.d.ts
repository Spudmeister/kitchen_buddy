/**
 * Photo Service - Manages recipe photos
 *
 * Requirements: 17.1, 17.4 - Store multiple photos per recipe, support common formats
 */
import type { Database } from '../db/database.js';
import type { Photo, PhotoInput, PhotoMetadata, SupportedImageFormat } from '../types/photo.js';
/**
 * Service for managing recipe photos
 */
export declare class PhotoService {
    private db;
    constructor(db: Database);
    /**
     * Check if a MIME type is supported
     * Requirements: 17.4 - Support JPEG, PNG, HEIC, HEIF formats
     */
    isSupportedFormat(mimeType: string): mimeType is SupportedImageFormat;
    /**
     * Get list of supported formats
     */
    getSupportedFormats(): SupportedImageFormat[];
    /**
     * Add a photo to a recipe
     * Requirements: 17.1 - Store multiple photos per recipe
     */
    addPhoto(recipeId: string, input: PhotoInput): Photo;
    /**
     * Get a photo by ID
     */
    getPhoto(id: string): Photo | undefined;
    /**
     * Get all photos for a recipe
     * Requirements: 17.1 - Store multiple photos per recipe
     */
    getPhotos(recipeId: string): Photo[];
    /**
     * Get photos for a specific recipe instance
     * Requirements: 17.2 - Store metadata including associated recipe instance
     */
    getPhotosByInstance(instanceId: string): Photo[];
    /**
     * Delete a photo
     */
    deletePhoto(id: string): void;
    /**
     * Update photo metadata
     */
    updatePhotoMetadata(id: string, metadata: PhotoMetadata): Photo;
    /**
     * Get the count of photos for a recipe
     */
    getPhotoCount(recipeId: string): number;
    /**
     * Get photos organized by instance (for displaying by cook session)
     * Requirements: 17.5 - Display photos organized by cook session
     */
    getPhotosGroupedByInstance(recipeId: string): Map<string | null, Photo[]>;
    /**
     * Get the instance ID from a photo
     * Requirements: 17.3 - Navigate from photo to exact recipe configuration
     */
    getInstanceIdFromPhoto(photoId: string): string | undefined;
    /**
     * Associate a photo with an instance
     * Requirements: 17.2 - Store metadata including associated recipe instance
     */
    associatePhotoWithInstance(photoId: string, instanceId: string): Photo;
    /**
     * Convert a database row to a Photo object
     */
    private rowToPhoto;
}
//# sourceMappingURL=photo-service.d.ts.map