/**
 * AI-related types for Sous Chef
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import type { Recipe } from './recipe.js';

/**
 * Supported AI providers
 * Requirements: 11.3 - Support multiple AI providers
 */
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

/**
 * AI configuration
 * Requirements: 11.2, 11.3, 11.4
 */
export interface AIConfig {
  /** AI provider to use */
  provider: AIProvider;
  /** API key for cloud providers (OpenAI, Anthropic) */
  apiKey?: string;
  /** Endpoint URL for local/custom providers (Ollama, custom) */
  endpoint?: string;
  /** Model name to use */
  model?: string;
}

/**
 * Tag suggestion from AI
 * Requirements: 3.2, 3.3
 */
export interface TagSuggestion {
  /** Suggested tag name */
  tag: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the suggestion */
  reason: string;
}

/**
 * Substitution suggestion
 */
export interface Substitution {
  /** Original ingredient name */
  original: string;
  /** Suggested substitute */
  substitute: string;
  /** Conversion ratio (e.g., 1.0 means 1:1) */
  ratio: number;
  /** Notes about the substitution */
  notes?: string;
}

/**
 * Chat context for Menu Assistant
 */
export interface ChatContext {
  /** Available recipes */
  recipes: Recipe[];
  /** Current menu being built */
  currentMenu?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  /** User preferences */
  preferences: {
    unitSystem?: 'us' | 'metric';
    defaultServings?: number;
    dietaryRestrictions?: string[];
  };
}

/**
 * AI service status
 */
export interface AIServiceStatus {
  /** Whether AI is enabled and configured */
  enabled: boolean;
  /** Current provider if enabled */
  provider?: AIProvider;
  /** Whether the configuration is valid */
  configured: boolean;
  /** Error message if configuration is invalid */
  error?: string;
}
