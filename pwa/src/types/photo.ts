/**
 * Photo-related types for Sous Chef PWA
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Supported image MIME types
 */
export type SupportedImageFormat =
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'image/heif';

/**
 * All supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS: SupportedImageFormat[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
];

/**
 * File extensions for supported formats
 */
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

/**
 * Accept string for file inputs
 */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif';

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
 * A stored photo
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
  /** When the photo was taken */
  takenAt?: Date;
  /** Photo metadata */
  metadata: PhotoMetadata;
  /** When the photo was added */
  createdAt: Date;
}

/**
 * Input for adding a photo
 */
export interface PhotoInput {
  /** Photo data as Blob */
  data: Blob;
  /** Original filename */
  filename: string;
  /** MIME type of the image */
  mimeType: SupportedImageFormat;
  /** Recipe ID to associate with */
  recipeId: string;
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
 * Photos grouped by cook session
 */
export interface PhotoGroup {
  /** Instance ID (null for photos not associated with a session) */
  instanceId: string | null;
  /** Session date (if available) */
  sessionDate?: Date;
  /** Photos in this group */
  photos: Photo[];
}

/**
 * Check if a MIME type is supported
 */
export function isSupportedFormat(mimeType: string): mimeType is SupportedImageFormat {
  return SUPPORTED_IMAGE_FORMATS.includes(mimeType as SupportedImageFormat);
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: SupportedImageFormat): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return '.jpg';
  }
}
