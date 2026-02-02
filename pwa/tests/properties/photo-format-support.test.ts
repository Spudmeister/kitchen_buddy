/**
 * Property Test: Photo Format Support
 *
 * **Feature: sous-chef-pwa, Property 14: Photo Format Support**
 * **Validates: Requirements 7.3**
 *
 * For any photo upload:
 * - JPEG, PNG, HEIC, HEIF formats SHALL all be accepted
 * - Photos SHALL display correctly regardless of format
 * - Unsupported formats SHALL be rejected
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_EXTENSIONS,
  isSupportedFormat,
  getExtensionFromMimeType,
  type SupportedImageFormat,
} from '../../src/types/photo';

/**
 * Arbitrary for generating a supported image format
 */
const supportedFormatArb: fc.Arbitrary<SupportedImageFormat> = fc.constantFrom(
  ...SUPPORTED_IMAGE_FORMATS
);

/**
 * Arbitrary for generating an unsupported MIME type
 */
const unsupportedFormatArb: fc.Arbitrary<string> = fc.constantFrom(
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'video/mp4',
  'audio/mpeg'
);

/**
 * Arbitrary for generating a filename with supported extension
 */
const supportedFilenameArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0 && !s.includes('.')),
    fc.constantFrom(...SUPPORTED_EXTENSIONS)
  )
  .map(([name, ext]) => `${name}${ext}`);

/**
 * Arbitrary for generating a filename with unsupported extension
 */
const unsupportedFilenameArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0 && !s.includes('.')),
    fc.constantFrom('.gif', '.webp', '.bmp', '.tiff', '.svg', '.pdf', '.txt', '.mp4')
  )
  .map(([name, ext]) => `${name}${ext}`);

/**
 * Check if a filename has a supported extension
 */
function hasSupportedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Simulate photo validation (what the component does)
 */
function validatePhoto(mimeType: string, filename: string): {
  valid: boolean;
  reason?: string;
} {
  // Check MIME type first
  if (isSupportedFormat(mimeType)) {
    return { valid: true };
  }

  // Fall back to extension check (for HEIC/HEIF which may not have correct MIME)
  if (hasSupportedExtension(filename)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: 'Unsupported image format. Please use JPEG, PNG, HEIC, or HEIF.',
  };
}

describe('Property 14: Photo Format Support', () => {
  it('should accept all supported MIME types', () => {
    fc.assert(
      fc.property(supportedFormatArb, (format) => {
        expect(isSupportedFormat(format)).toBe(true);
        expect(SUPPORTED_IMAGE_FORMATS).toContain(format);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject unsupported MIME types', () => {
    fc.assert(
      fc.property(unsupportedFormatArb, (format) => {
        expect(isSupportedFormat(format)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should include JPEG format', () => {
    expect(SUPPORTED_IMAGE_FORMATS).toContain('image/jpeg');
    expect(isSupportedFormat('image/jpeg')).toBe(true);
  });

  it('should include PNG format', () => {
    expect(SUPPORTED_IMAGE_FORMATS).toContain('image/png');
    expect(isSupportedFormat('image/png')).toBe(true);
  });

  it('should include HEIC format', () => {
    expect(SUPPORTED_IMAGE_FORMATS).toContain('image/heic');
    expect(isSupportedFormat('image/heic')).toBe(true);
  });

  it('should include HEIF format', () => {
    expect(SUPPORTED_IMAGE_FORMATS).toContain('image/heif');
    expect(isSupportedFormat('image/heif')).toBe(true);
  });

  it('should validate photos with supported MIME types', () => {
    fc.assert(
      fc.property(supportedFormatArb, supportedFilenameArb, (mimeType, filename) => {
        const result = validatePhoto(mimeType, filename);
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should validate photos by extension when MIME type is unknown', () => {
    fc.assert(
      fc.property(supportedFilenameArb, (filename) => {
        // Simulate unknown MIME type but valid extension
        const result = validatePhoto('application/octet-stream', filename);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject photos with unsupported MIME type and extension', () => {
    fc.assert(
      fc.property(unsupportedFormatArb, unsupportedFilenameArb, (mimeType, filename) => {
        const result = validatePhoto(mimeType, filename);
        expect(result.valid).toBe(false);
        expect(result.reason).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should return correct extension for each MIME type', () => {
    expect(getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
    expect(getExtensionFromMimeType('image/png')).toBe('.png');
    expect(getExtensionFromMimeType('image/heic')).toBe('.heic');
    expect(getExtensionFromMimeType('image/heif')).toBe('.heif');
  });

  it('should have exactly 4 supported formats', () => {
    expect(SUPPORTED_IMAGE_FORMATS.length).toBe(4);
  });

  it('should have matching extensions for all formats', () => {
    // Each format should have at least one matching extension
    expect(SUPPORTED_EXTENSIONS).toContain('.jpg');
    expect(SUPPORTED_EXTENSIONS).toContain('.jpeg');
    expect(SUPPORTED_EXTENSIONS).toContain('.png');
    expect(SUPPORTED_EXTENSIONS).toContain('.heic');
    expect(SUPPORTED_EXTENSIONS).toContain('.heif');
  });

  it('should handle case-insensitive extension matching', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_EXTENSIONS),
        fc.boolean(),
        (ext, uppercase) => {
          const filename = `photo${uppercase ? ext.toUpperCase() : ext}`;
          expect(hasSupportedExtension(filename)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
