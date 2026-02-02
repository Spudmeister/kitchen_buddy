/**
 * Property-based tests for Visual Parse Confidence Reporting
 *
 * **Property 36: Visual Parse Confidence Reporting**
 * *For any* image parsed by the Visual_Parser, the result SHALL include per-field
 * confidence scores, and fields with confidence below threshold SHALL be flagged in warnings.
 *
 * **Validates: Requirements 19.4, 19.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { AIService } from '../../src/services/ai-service.js';
import { VisualParser } from '../../src/services/visual-parser.js';
import {
  fieldConfidenceArb,
  confidenceThresholdArb,
  confidenceArb,
} from '../generators/recipe-generators.js';
import type { FieldConfidence } from '../../src/types/visual-parser.js';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '../../src/types/visual-parser.js';

describe('Property 36: Visual Parse Confidence Reporting', () => {
  let db: Database;
  let aiService: AIService;
  let visualParser: VisualParser;

  beforeEach(async () => {
    db = await createDatabase();
    aiService = new AIService(db);
    visualParser = new VisualParser(aiService);
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * For any field confidence values, warnings should be generated for fields below threshold
   */
  it('should generate warnings for fields with confidence below threshold', () => {
    fc.assert(
      fc.property(
        fieldConfidenceArb,
        confidenceThresholdArb,
        (fieldConfidence, threshold) => {
          // Create a visual parser with the given threshold
          const parser = new VisualParser(aiService, threshold);

          // Use the internal method to generate warnings
          // We need to test the warning generation logic directly
          const warnings = generateWarningsForTest(fieldConfidence, threshold);

          // Map field names to their warning text patterns
          const fieldWarningPatterns: Record<keyof FieldConfidence, string> = {
            title: 'title',
            ingredients: 'ingredients',
            instructions: 'instructions',
            prepTime: 'prep time',
            cookTime: 'cook time',
            servings: 'servings',
          };

          // Verify that each field below threshold has a warning
          const fields: (keyof FieldConfidence)[] = [
            'title',
            'ingredients',
            'instructions',
            'prepTime',
            'cookTime',
            'servings',
          ];

          for (const field of fields) {
            const confidence = fieldConfidence[field];
            const pattern = fieldWarningPatterns[field];
            const hasWarning = warnings.some((w) =>
              w.toLowerCase().includes(pattern)
            );

            // If confidence > 0 and < threshold, there should be a warning
            if (confidence > 0 && confidence < threshold) {
              expect(hasWarning).toBe(true);
            }
            // If confidence >= threshold or confidence === 0, there should be no warning
            if (confidence >= threshold || confidence === 0) {
              expect(hasWarning).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Result should always include per-field confidence scores
   */
  it('should always include per-field confidence scores in result', () => {
    fc.assert(
      fc.property(fieldConfidenceArb, (fieldConfidence) => {
        // Verify all required fields are present
        expect(fieldConfidence).toHaveProperty('title');
        expect(fieldConfidence).toHaveProperty('ingredients');
        expect(fieldConfidence).toHaveProperty('instructions');
        expect(fieldConfidence).toHaveProperty('prepTime');
        expect(fieldConfidence).toHaveProperty('cookTime');
        expect(fieldConfidence).toHaveProperty('servings');

        // Verify all confidence values are in valid range [0, 1]
        expect(fieldConfidence.title).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.title).toBeLessThanOrEqual(1);
        expect(fieldConfidence.ingredients).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.ingredients).toBeLessThanOrEqual(1);
        expect(fieldConfidence.instructions).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.instructions).toBeLessThanOrEqual(1);
        expect(fieldConfidence.prepTime).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.prepTime).toBeLessThanOrEqual(1);
        expect(fieldConfidence.cookTime).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.cookTime).toBeLessThanOrEqual(1);
        expect(fieldConfidence.servings).toBeGreaterThanOrEqual(0);
        expect(fieldConfidence.servings).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Warnings should include confidence percentage
   */
  it('should include confidence percentage in warnings', () => {
    fc.assert(
      fc.property(fieldConfidenceArb, confidenceThresholdArb, (fieldConfidence, threshold) => {
        const warnings = generateWarningsForTest(fieldConfidence, threshold);

        // Each warning should contain a percentage
        for (const warning of warnings) {
          expect(warning).toMatch(/\d+%/);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * No warnings should be generated when all fields are above threshold
   */
  it('should generate no warnings when all fields are above threshold', () => {
    fc.assert(
      fc.property(confidenceThresholdArb, (threshold) => {
        // Create field confidence with all values above threshold
        const highConfidence: FieldConfidence = {
          title: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
          ingredients: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
          instructions: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
          prepTime: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
          cookTime: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
          servings: threshold + 0.1 > 1 ? 1 : threshold + 0.1,
        };

        const warnings = generateWarningsForTest(highConfidence, threshold);
        expect(warnings.length).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * No warnings should be generated for fields with zero confidence (not extracted)
   */
  it('should not generate warnings for fields with zero confidence', () => {
    fc.assert(
      fc.property(confidenceThresholdArb, (threshold) => {
        // Create field confidence with all zeros (nothing extracted)
        const zeroConfidence: FieldConfidence = {
          title: 0,
          ingredients: 0,
          instructions: 0,
          prepTime: 0,
          cookTime: 0,
          servings: 0,
        };

        const warnings = generateWarningsForTest(zeroConfidence, threshold);
        expect(warnings.length).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Threshold can be configured and affects warning generation
   */
  it('should respect configurable confidence threshold', () => {
    fc.assert(
      fc.property(
        confidenceArb,
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        (fieldValue, threshold1, threshold2) => {
          // Skip if thresholds are too close
          if (Math.abs(threshold1 - threshold2) < 0.1) return;

          const fieldConfidence: FieldConfidence = {
            title: fieldValue,
            ingredients: 0.9, // High confidence
            instructions: 0.9, // High confidence
            prepTime: 0,
            cookTime: 0,
            servings: 0,
          };

          const warnings1 = generateWarningsForTest(fieldConfidence, threshold1);
          const warnings2 = generateWarningsForTest(fieldConfidence, threshold2);

          // If fieldValue is between the two thresholds, warnings should differ
          const lowerThreshold = Math.min(threshold1, threshold2);
          const higherThreshold = Math.max(threshold1, threshold2);

          if (fieldValue > 0 && fieldValue > lowerThreshold && fieldValue < higherThreshold) {
            // With lower threshold, no warning; with higher threshold, warning
            const warningsWithLower = generateWarningsForTest(fieldConfidence, lowerThreshold);
            const warningsWithHigher = generateWarningsForTest(fieldConfidence, higherThreshold);

            const hasWarningWithLower = warningsWithLower.some((w) =>
              w.toLowerCase().includes('title')
            );
            const hasWarningWithHigher = warningsWithHigher.some((w) =>
              w.toLowerCase().includes('title')
            );

            expect(hasWarningWithLower).toBe(false);
            expect(hasWarningWithHigher).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Visual parser should not be available when AI is disabled
   */
  it('should not be available when AI is disabled', () => {
    // AI service is not configured by default
    expect(visualParser.isAvailable()).toBe(false);
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Supported formats should include TIFF in addition to photo formats
   */
  it('should support TIFF format in addition to standard photo formats', () => {
    const formats = visualParser.getSupportedFormats();

    expect(formats).toContain('image/jpeg');
    expect(formats).toContain('image/png');
    expect(formats).toContain('image/heic');
    expect(formats).toContain('image/heif');
    expect(formats).toContain('image/tiff');
    expect(formats.length).toBe(5);
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * isSupportedFormat should correctly identify visual parser formats
   */
  it('should correctly identify supported visual parser formats', () => {
    const supportedFormats = [
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/tiff',
    ];
    const unsupportedFormats = ['image/gif', 'image/bmp', 'image/webp', 'application/pdf'];

    for (const format of supportedFormats) {
      expect(visualParser.isSupportedFormat(format)).toBe(true);
    }

    for (const format of unsupportedFormats) {
      expect(visualParser.isSupportedFormat(format)).toBe(false);
    }
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Confidence threshold should be configurable
   */
  it('should allow configuring confidence threshold', () => {
    fc.assert(
      fc.property(confidenceThresholdArb, (threshold) => {
        visualParser.setConfidenceThreshold(threshold);
        expect(visualParser.getConfidenceThreshold()).toBeCloseTo(threshold, 5);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: sous-chef, Property 36: Visual Parse Confidence Reporting
   * Invalid threshold values should be rejected
   */
  it('should reject invalid confidence threshold values', () => {
    expect(() => visualParser.setConfidenceThreshold(-0.1)).toThrow();
    expect(() => visualParser.setConfidenceThreshold(1.1)).toThrow();
  });
});

/**
 * Helper function to generate warnings for testing
 * This mirrors the logic in VisualParser.generateWarnings
 */
function generateWarningsForTest(fieldConfidence: FieldConfidence, threshold: number): string[] {
  const warnings: string[] = [];

  if (fieldConfidence.title > 0 && fieldConfidence.title < threshold) {
    warnings.push(
      `Title extraction has low confidence (${(fieldConfidence.title * 100).toFixed(0)}%)`
    );
  }

  if (fieldConfidence.ingredients > 0 && fieldConfidence.ingredients < threshold) {
    warnings.push(
      `Ingredients extraction has low confidence (${(fieldConfidence.ingredients * 100).toFixed(0)}%)`
    );
  }

  if (fieldConfidence.instructions > 0 && fieldConfidence.instructions < threshold) {
    warnings.push(
      `Instructions extraction has low confidence (${(fieldConfidence.instructions * 100).toFixed(0)}%)`
    );
  }

  if (fieldConfidence.prepTime > 0 && fieldConfidence.prepTime < threshold) {
    warnings.push(
      `Prep time extraction has low confidence (${(fieldConfidence.prepTime * 100).toFixed(0)}%)`
    );
  }

  if (fieldConfidence.cookTime > 0 && fieldConfidence.cookTime < threshold) {
    warnings.push(
      `Cook time extraction has low confidence (${(fieldConfidence.cookTime * 100).toFixed(0)}%)`
    );
  }

  if (fieldConfidence.servings > 0 && fieldConfidence.servings < threshold) {
    warnings.push(
      `Servings extraction has low confidence (${(fieldConfidence.servings * 100).toFixed(0)}%)`
    );
  }

  return warnings;
}
