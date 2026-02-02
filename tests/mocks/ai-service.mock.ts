/**
 * Mock AI Service for Sous Chef Testing
 * 
 * Provides pre-recorded responses for deterministic testing.
 * Simulates AI provider behavior without actual API calls.
 * 
 * Requirements: Design - Testing Strategy
 */

import type { Recipe } from '../../src/types/recipe.js';
import type {
  AIConfig,
  AIProvider,
  AIServiceStatus,
  TagSuggestion,
  Substitution,
  ChatContext,
} from '../../src/types/ai.js';
import type { ParsedRecipe } from '../../src/services/recipe-parser.js';

/**
 * Pre-recorded AI responses for testing
 */
export interface MockAIResponses {
  parseRecipe?: ParsedRecipe;
  suggestTags?: TagSuggestion[];
  suggestSubstitutions?: Substitution[];
  chat?: string;
}

/**
 * Mock AI Service for testing
 * 
 * This mock provides deterministic responses for testing AI-dependent features
 * without making actual API calls.
 */
export class MockAIService {
  private enabled: boolean = false;
  private config: AIConfig | null = null;
  private responses: MockAIResponses = {};
  private callHistory: Array<{ method: string; args: unknown[] }> = [];

  /**
   * Configure the mock with pre-recorded responses
   */
  setResponses(responses: MockAIResponses): void {
    this.responses = responses;
  }

  /**
   * Enable or disable the mock AI service
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && !this.config) {
      this.config = {
        provider: 'openai',
        apiKey: 'mock-api-key',
        model: 'gpt-4o-mini',
      };
    }
  }

  /**
   * Get call history for verification
   */
  getCallHistory(): Array<{ method: string; args: unknown[] }> {
    return [...this.callHistory];
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset the mock to initial state
   */
  reset(): void {
    this.enabled = false;
    this.config = null;
    this.responses = {};
    this.callHistory = [];
  }

  /**
   * Check if AI features are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current AI service status
   */
  getStatus(): AIServiceStatus {
    if (!this.enabled || !this.config) {
      return {
        enabled: false,
        configured: false,
      };
    }

    return {
      enabled: true,
      provider: this.config.provider,
      configured: true,
    };
  }

  /**
   * Configure the AI service
   */
  async configure(config: AIConfig): Promise<void> {
    this.callHistory.push({ method: 'configure', args: [config] });
    this.config = config;
    this.enabled = true;
  }

  /**
   * Load configuration (no-op for mock)
   */
  async loadConfig(): Promise<void> {
    this.callHistory.push({ method: 'loadConfig', args: [] });
  }

  /**
   * Clear AI configuration
   */
  async clearConfig(): Promise<void> {
    this.callHistory.push({ method: 'clearConfig', args: [] });
    this.config = null;
    this.enabled = false;
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AIConfig, 'apiKey'> | null {
    if (!this.config) {
      return null;
    }
    const { apiKey: _apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Parse recipe from HTML using mock response
   */
  async parseRecipe(html: string): Promise<ParsedRecipe> {
    this.callHistory.push({ method: 'parseRecipe', args: [html] });

    if (!this.enabled) {
      throw new Error('AI features are not enabled');
    }

    if (this.responses.parseRecipe) {
      return this.responses.parseRecipe;
    }

    // Default mock response
    return {
      title: 'Mock Parsed Recipe',
      description: 'A recipe parsed by the mock AI service',
      ingredients: ['1 cup mock ingredient', '2 tbsp mock seasoning'],
      instructions: ['Step 1: Mock instruction', 'Step 2: Another mock step'],
      prepTime: { minutes: 15 },
      cookTime: { minutes: 30 },
      servings: 4,
    };
  }

  /**
   * Suggest tags for a recipe using mock response
   */
  async suggestTags(recipe: Recipe): Promise<TagSuggestion[]> {
    this.callHistory.push({ method: 'suggestTags', args: [recipe] });

    if (!this.enabled) {
      throw new Error('AI features are not enabled');
    }

    if (this.responses.suggestTags) {
      return this.responses.suggestTags;
    }

    // Default mock response based on recipe
    const suggestions: TagSuggestion[] = [
      { tag: 'mock-tag', confidence: 0.9, reason: 'Mock suggestion' },
    ];

    // Add some context-aware suggestions
    if (recipe.prepTime.minutes + recipe.cookTime.minutes < 30) {
      suggestions.push({ tag: 'quick', confidence: 0.85, reason: 'Short total time' });
    }

    if (recipe.ingredients.length > 10) {
      suggestions.push({ tag: 'complex', confidence: 0.7, reason: 'Many ingredients' });
    }

    return suggestions;
  }

  /**
   * Suggest ingredient substitutions using mock response
   */
  async suggestSubstitutions(ingredientName: string): Promise<Substitution[]> {
    this.callHistory.push({ method: 'suggestSubstitutions', args: [ingredientName] });

    if (!this.enabled) {
      throw new Error('AI features are not enabled');
    }

    if (this.responses.suggestSubstitutions) {
      return this.responses.suggestSubstitutions;
    }

    // Default mock substitutions
    return [
      {
        original: ingredientName,
        substitute: `mock substitute for ${ingredientName}`,
        ratio: 1.0,
        notes: 'Mock substitution',
      },
    ];
  }

  /**
   * Chat with Menu Assistant using mock response
   */
  async chat(message: string, context: ChatContext): Promise<string> {
    this.callHistory.push({ method: 'chat', args: [message, context] });

    if (!this.enabled) {
      throw new Error('AI features are not enabled');
    }

    if (this.responses.chat) {
      return this.responses.chat;
    }

    // Default mock chat response
    const recipeCount = context.recipes.length;
    return `Hi! I'm Sue, your mock menu assistant. You have ${recipeCount} recipes available. How can I help you plan your meals?`;
  }
}

/**
 * Pre-built mock responses for common test scenarios
 */
export const mockResponses = {
  /** Successful recipe parsing */
  successfulParse: {
    parseRecipe: {
      title: 'Test Recipe',
      description: 'A test recipe for unit testing',
      ingredients: [
        '2 cups flour',
        '1 cup sugar',
        '3 eggs',
        '1/2 cup butter',
      ],
      instructions: [
        'Preheat oven to 350°F',
        'Mix dry ingredients',
        'Add wet ingredients',
        'Bake for 30 minutes',
      ],
      prepTime: { minutes: 15 },
      cookTime: { minutes: 30 },
      servings: 8,
    } as ParsedRecipe,
  },

  /** Tag suggestions for Italian recipe */
  italianTags: {
    suggestTags: [
      { tag: 'italian', confidence: 0.95, reason: 'Contains pasta and Italian seasonings' },
      { tag: 'pasta', confidence: 0.9, reason: 'Main ingredient is pasta' },
      { tag: 'dinner', confidence: 0.85, reason: 'Typical dinner dish' },
      { tag: 'comfort-food', confidence: 0.7, reason: 'Classic comfort dish' },
    ] as TagSuggestion[],
  },

  /** Tag suggestions for healthy recipe */
  healthyTags: {
    suggestTags: [
      { tag: 'healthy', confidence: 0.9, reason: 'Low calorie, high nutrients' },
      { tag: 'vegetarian', confidence: 0.85, reason: 'No meat ingredients' },
      { tag: 'quick', confidence: 0.8, reason: 'Under 30 minutes total' },
      { tag: 'lunch', confidence: 0.75, reason: 'Light meal suitable for lunch' },
    ] as TagSuggestion[],
  },

  /** Butter substitutions */
  butterSubstitutions: {
    suggestSubstitutions: [
      { original: 'butter', substitute: 'coconut oil', ratio: 1.0, notes: 'Vegan alternative' },
      { original: 'butter', substitute: 'applesauce', ratio: 0.5, notes: 'For baking, reduces fat' },
      { original: 'butter', substitute: 'Greek yogurt', ratio: 0.5, notes: 'Adds moisture and protein' },
    ] as Substitution[],
  },

  /** Egg substitutions */
  eggSubstitutions: {
    suggestSubstitutions: [
      { original: 'egg', substitute: 'flax egg', ratio: 1.0, notes: '1 tbsp ground flax + 3 tbsp water' },
      { original: 'egg', substitute: 'banana', ratio: 0.5, notes: 'Half a mashed banana per egg' },
      { original: 'egg', substitute: 'aquafaba', ratio: 3.0, notes: '3 tbsp per egg' },
    ] as Substitution[],
  },

  /** Menu assistant chat responses */
  menuAssistantGreeting: {
    chat: "Hi! I'm Sue, your menu planning assistant. I can help you plan meals, suggest recipes based on what you have, and create balanced menus. What would you like to cook this week?",
  },

  menuAssistantSuggestion: {
    chat: "Based on your preferences, I'd suggest trying the Chicken Tikka Masala for dinner tonight. It's highly rated and you haven't made it in a while. Would you like me to add it to your menu?",
  },
};

/**
 * Create a configured mock AI service
 */
export function createMockAIService(options?: {
  enabled?: boolean;
  responses?: MockAIResponses;
}): MockAIService {
  const mock = new MockAIService();
  
  if (options?.enabled) {
    mock.setEnabled(true);
  }
  
  if (options?.responses) {
    mock.setResponses(options.responses);
  }
  
  return mock;
}
