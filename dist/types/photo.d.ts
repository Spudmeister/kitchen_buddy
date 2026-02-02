/**
 * Photo-related types for Sous Chef
 */
/**
 * Supported image MIME types
 * Requirements: 17.4 - Support JPEG, PNG, HEIC, HEIF formats
 */
export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/heic' | 'image/heif';
/**
 * All supported image formats
 */
export declare const SUPPORTED_IMAGE_FORMATS: SupportedImageFormat[];
/**
 * Photo metadata
 */
export interface PhotoMetadata {
    /** Optional caption for the photo */
    caption?: string;
    /** Which instruction step this photo relates to */
    step?: number;
    /** Tags for the photo */
    tags?: string[];
}
/**
 * Input for adding a photo
 */
export interface PhotoInput {
    /** Photo data as base64 string or raw bytes */
    data: string | Uint8Array;
    /** Original filename */
    filename: string;
    /** MIME type of the image */
    mimeType: SupportedImageFormat;
    /** Optional instance ID to associate with */
    instanceId?: string;
    /** Optional metadata */
    metadata?: PhotoMetadata;
    /** Optional width (if known) */
    width?: number;
    /** Optional height (if known) */
    height?: number;
    /** Optional timestamp when photo was taken */
    takenAt?: Date;
}
/**
 * A stored photo
 * Requirements: 17.1 - Store multiple photos per recipe
 */
export interface Photo {
    /** Unique identifier */
    id: string;
    /** Recipe ID this photo belongs to */
    recipeId: string;
    /** Optional instance ID (links to specific cook session) */
    instanceId?: string;
    /** Original filename */
    filename: string;
    /** MIME type */
    mimeType: SupportedImageFormat;
    /** Image width in pixels */
    width?: number;
    /** Image height in pixels */
    height?: number;
    /** Path to stored file */
    filePath: string;
    /** When the photo was taken */
    takenAt?: Date;
    /** Photo metadata */
    metadata: PhotoMetadata;
    /** When the photo was added */
    createdAt: Date;
}
//# sourceMappingURL=photo.d.ts.map