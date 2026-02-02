/**
 * AI Service for Sous Chef
 * Provides AI-powered features with support for multiple providers
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 * - 11.1: App functions fully without AI features enabled
 * - 11.2: Requires API key configuration when enabled
 * - 11.3: Supports multiple AI providers (cloud APIs and local models)
 * - 11.4: Supports local AI models without external API calls
 * - 11.5: Stores API keys securely in local configuration
 * - 11.6: Hides AI-dependent UI elements when disabled
 * - 11.7: Clearly indicates which features require AI
 */
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { AIConfig, AIServiceStatus, TagSuggestion, Substitution, ChatContext } from '../types/ai.js';
import type { ParsedRecipe } from './recipe-parser.js';
/**
 * AI Service - Abstraction layer for AI features
 *
 * This service provides a unified interface for AI-powered features
 * while supporting multiple providers (OpenAI, Anthropic, Ollama, custom).
 *
 * The app works fully without AI; AI enhances but never gates functionality.
 */
export declare class AIService {
    private configStore;
    private config;
    constructor(db: Database);
    /**
     * Check if AI features are enabled
     * Requirements: 11.1 - App functions fully without AI
     */
    isEnabled(): boolean;
    /**
     * Get current AI service status
     */
    getStatus(): AIServiceStatus;
    /**
     * Configure the AI service
     * Requirements: 11.2 - Requires API key configuration
     * Requirements: 11.5 - Stores API keys securely
     */
    configure(config: AIConfig): Promise<void>;
    /**
     * Load configuration from storage
     */
    loadConfig(): Promise<void>;
    /**
     * Clear AI configuration (disable AI features)
     */
    clearConfig(): Promise<void>;
    /**
     * Get current configuration (without sensitive data)
     */
    getConfig(): Omit<AIConfig, 'apiKey'> | null;
    /**
     * Validate AI configuration
     */
    private validateConfig;
    /**
     * Check if configuration is valid
     */
    private isConfigValid;
    /**
     * Get the effective endpoint for the current provider
     */
    private getEndpoint;
    /**
     * Get the effective model for the current provider
     */
    private getModel;
    /**
     * Parse recipe from HTML using AI
     * Requirements: 1.6 - AI extraction for unstructured pages
     */
    parseRecipe(html: string): Promise<ParsedRecipe>;
    /**
     * Suggest tags for a recipe using AI
     * Requirements: 3.2, 3.3 - AI-powered tag suggestions
     */
    suggestTags(recipe: Recipe): Promise<TagSuggestion[]>;
    /**
     * Suggest ingredient substitutions using AI
     */
    suggestSubstitutions(ingredientName: string): Promise<Substitution[]>;
    /**
     * Chat with Menu Assistant (Sue)
     * Requirements: 16.1, 16.2 - AI-powered menu assistance
     */
    chat(message: string, context: ChatContext): Promise<string>;
    /**
     * Send request to AI provider
     */
    private sendRequest;
    /**
     * Send request to OpenAI API
     */
    private sendOpenAIRequest;
    /**
     * Send request to Anthropic API
     */
    private sendAnthropicRequest;
    /**
     * Send request to Ollama API
     * Requirements: 11.4 - Local AI models without external API calls
     */
    private sendOllamaRequest;
    /**
     * Send request to custom API endpoint
     */
    private sendCustomRequest;
    /**
     * Build prompt for recipe parsing
     */
    private buildRecipeParsePrompt;
    /**
     * Parse recipe from AI response
     */
    private parseRecipeResponse;
    /**
     * Parse ISO 8601 duration to Duration object
     */
    private parseISODuration;
    /**
     * Build prompt for tag suggestions
     */
    private buildTagSuggestionPrompt;
    /**
     * Parse tag suggestions from AI response
     */
    private parseTagSuggestionResponse;
    /**
     * Build prompt for substitution suggestions
     */
    private buildSubstitutionPrompt;
    /**
     * Parse substitution suggestions from AI response
     */
    private parseSubstitutionResponse;
    /**
     * Build prompt for chat with Menu Assistant
     */
    private buildChatPrompt;
}
//# sourceMappingURL=ai-service.d.ts.map