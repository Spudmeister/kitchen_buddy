/**
 * Visual Parser Service for Sous Chef
 * Extracts recipe data from photos of handwritten or printed recipes using AI
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 * - 19.1: Available when AI features are enabled
 * - 19.2: Uses configured AI provider to extract recipe data
 * - 19.3: Supports JPEG, PNG, HEIC, HEIF, TIFF formats
 * - 19.4: Presents extracted data with per-field confidence scores
 * - 19.5: Highlights low-confidence fields for user attention
 */

import type { AIService } from './ai-service.js';
import type { ParsedRecipe } from './recipe-parser.js';
import type {
  VisualParserImageFormat,
  VisualParseOptions,
  VisualParseResult,
  FieldConfidence,
} from '../types/visual-parser.js';
import {
  VISUAL_PARSER_SUPPORTED_FORMATS,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from '../types/visual-parser.js';

/**
 * AI response structure for visual parsing
 */
interface AIVisualParseResponse {
  title?: string;
  titleConfidence?: number;
  description?: string;
  ingredients?: string[];
  ingredientsConfidence?: number;
  instructions?: string[];
  instructionsConfidence?: number;
  prepTime?: string;
  prepTimeConfidence?: number;
  cookTime?: string;
  cookTimeConfidence?: number;
  servings?: number;
  servingsConfidence?: number;
  rawText?: string;
}

/**
 * Visual Parser Service
 * Extracts recipe data from images using AI
 */
export class VisualParser {
  private aiService: AIService;
  private confidenceThreshold: number;

  constructor(aiService: AIService, confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD) {
    this.aiService = aiService;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Check if visual parsing is available
   * Requirements: 19.1 - Available when AI features are enabled
   */
  isAvailable(): boolean {
    return this.aiService.isEnabled();
  }

  /**
   * Get list of supported image formats
   * Requirements: 19.3 - Support JPEG, PNG, HEIC, HEIF, TIFF
   */
  getSupportedFormats(): VisualParserImageFormat[] {
    return [...VISUAL_PARSER_SUPPORTED_FORMATS];
  }

  /**
   * Check if a MIME type is supported
   */
  isSupportedFormat(mimeType: string): mimeType is VisualParserImageFormat {
    return VISUAL_PARSER_SUPPORTED_FORMATS.includes(mimeType as VisualParserImageFormat);
  }

  /**
   * Parse recipe from an image
   * Requirements: 19.2 - Use AI provider to extract recipe data
   * Requirements: 19.4, 19.5 - Per-field confidence and warnings
   */
  async parseFromImage(
    image: Blob | ArrayBuffer,
    options?: VisualParseOptions
  ): Promise<VisualParseResult> {
    // Check if AI is available
    if (!this.isAvailable()) {
      return {
        success: false,
        confidence: 0,
        fieldConfidence: this.createEmptyFieldConfidence(),
        errors: ['AI features are not enabled. Visual parsing requires AI to be configured.'],
      };
    }

    try {
      // Convert image to base64
      const base64Image = await this.imageToBase64(image);

      // Build the prompt for AI
      const prompt = this.buildVisualParsePrompt(base64Image, options);

      // Send request to AI service
      const response = await this.sendVisualParseRequest(prompt, base64Image);

      // Parse the AI response
      const parsed = this.parseAIResponse(response);

      // Build the result with confidence scores
      return this.buildResult(parsed);
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        fieldConfidence: this.createEmptyFieldConfidence(),
        errors: [
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during visual parsing',
        ],
      };
    }
  }

  /**
   * Convert image to base64 string
   */
  private async imageToBase64(image: Blob | ArrayBuffer): Promise<string> {
    let arrayBuffer: ArrayBuffer;

    if (image instanceof Blob) {
      arrayBuffer = await image.arrayBuffer();
    } else {
      arrayBuffer = image;
    }

    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCharCode(byte);
      }
    }
    return btoa(binary);
  }

  /**
   * Build the prompt for visual parsing
   */
  private buildVisualParsePrompt(base64Image: string, options?: VisualParseOptions): string {
    const languageHint = options?.language ? `The text may be in ${options.language}.` : '';
    const typeHint = options?.recipeType
      ? `This is a ${options.recipeType} recipe.`
      : 'This may be a handwritten, printed, or screenshot recipe.';

    return `You are analyzing an image of a recipe. ${typeHint} ${languageHint}

Extract the recipe information from the image and return a JSON object with the following structure:
{
  "title": "Recipe title",
  "titleConfidence": 0.0-1.0,
  "description": "Optional description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "ingredientsConfidence": 0.0-1.0,
  "instructions": ["step 1", "step 2", ...],
  "instructionsConfidence": 0.0-1.0,
  "prepTime": "ISO 8601 duration like PT15M (optional)",
  "prepTimeConfidence": 0.0-1.0,
  "cookTime": "ISO 8601 duration like PT30M (optional)",
  "cookTimeConfidence": 0.0-1.0,
  "servings": number (optional),
  "servingsConfidence": 0.0-1.0,
  "rawText": "The raw text extracted from the image"
}

Confidence scores should reflect how certain you are about each field:
- 1.0: Very confident, text is clear and unambiguous
- 0.7-0.9: Reasonably confident, minor uncertainty
- 0.4-0.6: Moderate confidence, some text unclear or ambiguous
- 0.1-0.3: Low confidence, significant uncertainty
- 0.0: Could not extract this field

If you cannot read or extract a field, omit it or set its confidence to 0.

Only return the JSON object, no other text.`;
  }

  /**
   * Send visual parse request to AI service
   */
  private async sendVisualParseRequest(prompt: string, base64Image: string): Promise<string> {
    return await this.aiService.analyzeImage(prompt, base64Image);
  }

  /**
   * Parse the AI response into structured data
   */
  private parseAIResponse(response: string): AIVisualParseResponse {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const data = JSON.parse(jsonMatch[0]) as AIVisualParseResponse;
      return data;
    } catch (error) {
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build the final result with confidence scores and warnings
   * Requirements: 19.4, 19.5 - Per-field confidence and low-confidence warnings
   */
  private buildResult(parsed: AIVisualParseResponse): VisualParseResult {
    // Build field confidence
    const fieldConfidence: FieldConfidence = {
      title: parsed.titleConfidence ?? (parsed.title ? 0.5 : 0),
      ingredients: parsed.ingredientsConfidence ?? (parsed.ingredients?.length ? 0.5 : 0),
      instructions: parsed.instructionsConfidence ?? (parsed.instructions?.length ? 0.5 : 0),
      prepTime: parsed.prepTimeConfidence ?? (parsed.prepTime ? 0.5 : 0),
      cookTime: parsed.cookTimeConfidence ?? (parsed.cookTime ? 0.5 : 0),
      servings: parsed.servingsConfidence ?? (parsed.servings ? 0.5 : 0),
    };

    // Generate warnings for low-confidence fields
    const warnings = this.generateWarnings(fieldConfidence);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(fieldConfidence);

    // Build parsed recipe
    const recipe: ParsedRecipe | undefined =
      parsed.title || parsed.ingredients?.length || parsed.instructions?.length
        ? {
            title: parsed.title || 'Untitled Recipe',
            description: parsed.description,
            ingredients: parsed.ingredients || [],
            instructions: parsed.instructions || [],
            prepTime: parsed.prepTime ? this.parseISODuration(parsed.prepTime) : undefined,
            cookTime: parsed.cookTime ? this.parseISODuration(parsed.cookTime) : undefined,
            servings: parsed.servings,
          }
        : undefined;

    const success = recipe !== undefined && confidence > 0;

    return {
      success,
      recipe,
      confidence,
      fieldConfidence,
      warnings: warnings.length > 0 ? warnings : undefined,
      rawText: parsed.rawText,
      errors: success ? undefined : ['Could not extract recipe data from image'],
    };
  }

  /**
   * Generate warnings for low-confidence fields
   * Requirements: 19.5 - Highlight low-confidence fields
   */
  private generateWarnings(fieldConfidence: FieldConfidence): string[] {
    const warnings: string[] = [];
    const threshold = this.confidenceThreshold;

    if (fieldConfidence.title > 0 && fieldConfidence.title < threshold) {
      warnings.push(`Title extraction has low confidence (${(fieldConfidence.title * 100).toFixed(0)}%)`);
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

  /**
   * Calculate overall confidence from field confidences
   */
  private calculateOverallConfidence(fieldConfidence: FieldConfidence): number {
    // Weight the fields by importance
    const weights = {
      title: 0.15,
      ingredients: 0.35,
      instructions: 0.35,
      prepTime: 0.05,
      cookTime: 0.05,
      servings: 0.05,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    // Only include fields that have some confidence (were extracted)
    for (const [field, weight] of Object.entries(weights)) {
      const confidence = fieldConfidence[field as keyof FieldConfidence];
      if (confidence > 0) {
        weightedSum += confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Create empty field confidence object
   */
  private createEmptyFieldConfidence(): FieldConfidence {
    return {
      title: 0,
      ingredients: 0,
      instructions: 0,
      prepTime: 0,
      cookTime: 0,
      servings: 0,
    };
  }

  /**
   * Parse ISO 8601 duration to Duration object
   */
  private parseISODuration(iso: string): { minutes: number } | undefined {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return undefined;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return { minutes: hours * 60 + minutes };
  }

  /**
   * Set the confidence threshold for warnings
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Get the current confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
