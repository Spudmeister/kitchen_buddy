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
import type { VisualParserImageFormat, VisualParseOptions, VisualParseResult } from '../types/visual-parser.js';
/**
 * Visual Parser Service
 * Extracts recipe data from images using AI
 */
export declare class VisualParser {
    private aiService;
    private confidenceThreshold;
    constructor(aiService: AIService, confidenceThreshold?: number);
    /**
     * Check if visual parsing is available
     * Requirements: 19.1 - Available when AI features are enabled
     */
    isAvailable(): boolean;
    /**
     * Get list of supported image formats
     * Requirements: 19.3 - Support JPEG, PNG, HEIC, HEIF, TIFF
     */
    getSupportedFormats(): VisualParserImageFormat[];
    /**
     * Check if a MIME type is supported
     */
    isSupportedFormat(mimeType: string): mimeType is VisualParserImageFormat;
    /**
     * Parse recipe from an image
     * Requirements: 19.2 - Use AI provider to extract recipe data
     * Requirements: 19.4, 19.5 - Per-field confidence and warnings
     */
    parseFromImage(image: Blob | ArrayBuffer, options?: VisualParseOptions): Promise<VisualParseResult>;
    /**
     * Convert image to base64 string
     */
    private imageToBase64;
    /**
     * Build the prompt for visual parsing
     */
    private buildVisualParsePrompt;
    /**
     * Send visual parse request to AI service
     * This method handles the vision-capable API call
     */
    private sendVisualParseRequest;
    /**
     * Call AI service with vision capability
     * This is a placeholder that would be implemented based on the AI provider
     */
    private callAIWithVision;
    /**
     * Call OpenAI Vision API
     */
    private callOpenAIVision;
    /**
     * Call Anthropic Vision API
     */
    private callAnthropicVision;
    /**
     * Call Ollama Vision API (for models like llava)
     */
    private callOllamaVision;
    /**
     * Call custom Vision API (OpenAI-compatible format)
     */
    private callCustomVision;
    /**
     * Parse the AI response into structured data
     */
    private parseAIResponse;
    /**
     * Build the final result with confidence scores and warnings
     * Requirements: 19.4, 19.5 - Per-field confidence and low-confidence warnings
     */
    private buildResult;
    /**
     * Generate warnings for low-confidence fields
     * Requirements: 19.5 - Highlight low-confidence fields
     */
    private generateWarnings;
    /**
     * Calculate overall confidence from field confidences
     */
    private calculateOverallConfidence;
    /**
     * Create empty field confidence object
     */
    private createEmptyFieldConfidence;
    /**
     * Parse ISO 8601 duration to Duration object
     */
    private parseISODuration;
    /**
     * Set the confidence threshold for warnings
     */
    setConfidenceThreshold(threshold: number): void;
    /**
     * Get the current confidence threshold
     */
    getConfidenceThreshold(): number;
}
//# sourceMappingURL=visual-parser.d.ts.map