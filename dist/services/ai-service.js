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
import { AIConfigStore } from './ai-config-store.js';
/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    ollama: 'llama3.2',
    custom: 'default',
};
/**
 * Default endpoints for providers
 */
const DEFAULT_ENDPOINTS = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    ollama: 'http://localhost:11434',
    custom: 'http://localhost:8080',
};
/**
 * AI Service - Abstraction layer for AI features
 *
 * This service provides a unified interface for AI-powered features
 * while supporting multiple providers (OpenAI, Anthropic, Ollama, custom).
 *
 * The app works fully without AI; AI enhances but never gates functionality.
 */
export class AIService {
    configStore;
    config = null;
    constructor(db) {
        this.configStore = new AIConfigStore(db);
    }
    /**
     * Check if AI features are enabled
     * Requirements: 11.1 - App functions fully without AI
     */
    isEnabled() {
        return this.config !== null && this.isConfigValid(this.config);
    }
    /**
     * Get current AI service status
     */
    getStatus() {
        if (!this.config) {
            return {
                enabled: false,
                configured: false,
            };
        }
        const validationError = this.validateConfig(this.config);
        if (validationError) {
            return {
                enabled: false,
                provider: this.config.provider,
                configured: false,
                error: validationError,
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
     * Requirements: 11.2 - Requires API key configuration
     * Requirements: 11.5 - Stores API keys securely
     */
    async configure(config) {
        // Validate configuration
        const validationError = this.validateConfig(config);
        if (validationError) {
            throw new Error(validationError);
        }
        // Store configuration securely
        await this.configStore.saveConfig(config);
        this.config = config;
    }
    /**
     * Load configuration from storage
     */
    async loadConfig() {
        this.config = await this.configStore.loadConfig();
    }
    /**
     * Clear AI configuration (disable AI features)
     */
    async clearConfig() {
        await this.configStore.clearConfig();
        this.config = null;
    }
    /**
     * Get current configuration (without sensitive data)
     */
    getConfig() {
        if (!this.config) {
            return null;
        }
        // Return config without API key for security
        const { apiKey: _apiKey, ...safeConfig } = this.config;
        return safeConfig;
    }
    /**
     * Validate AI configuration
     */
    validateConfig(config) {
        // Check provider
        if (!['openai', 'anthropic', 'ollama', 'custom'].includes(config.provider)) {
            return `Invalid provider: ${config.provider}`;
        }
        // Cloud providers require API key
        if (['openai', 'anthropic'].includes(config.provider)) {
            if (!config.apiKey || config.apiKey.trim().length === 0) {
                return `API key is required for ${config.provider}`;
            }
        }
        // Local/custom providers require endpoint
        if (['ollama', 'custom'].includes(config.provider)) {
            const endpoint = config.endpoint || DEFAULT_ENDPOINTS[config.provider];
            try {
                new URL(endpoint);
            }
            catch {
                return `Invalid endpoint URL: ${endpoint}`;
            }
        }
        return null;
    }
    /**
     * Check if configuration is valid
     */
    isConfigValid(config) {
        return this.validateConfig(config) === null;
    }
    /**
     * Get the effective endpoint for the current provider
     */
    getEndpoint() {
        if (!this.config) {
            throw new Error('AI service not configured');
        }
        return this.config.endpoint || DEFAULT_ENDPOINTS[this.config.provider];
    }
    /**
     * Get the effective model for the current provider
     */
    getModel() {
        if (!this.config) {
            throw new Error('AI service not configured');
        }
        return this.config.model || DEFAULT_MODELS[this.config.provider];
    }
    /**
     * Parse recipe from HTML using AI
     * Requirements: 1.6 - AI extraction for unstructured pages
     */
    async parseRecipe(html) {
        if (!this.isEnabled()) {
            throw new Error('AI features are not enabled');
        }
        const prompt = this.buildRecipeParsePrompt(html);
        const response = await this.sendRequest(prompt);
        return this.parseRecipeResponse(response);
    }
    /**
     * Suggest tags for a recipe using AI
     * Requirements: 3.2, 3.3 - AI-powered tag suggestions
     */
    async suggestTags(recipe) {
        if (!this.isEnabled()) {
            throw new Error('AI features are not enabled');
        }
        const prompt = this.buildTagSuggestionPrompt(recipe);
        const response = await this.sendRequest(prompt);
        return this.parseTagSuggestionResponse(response);
    }
    /**
     * Suggest ingredient substitutions using AI
     */
    async suggestSubstitutions(ingredientName) {
        if (!this.isEnabled()) {
            throw new Error('AI features are not enabled');
        }
        const prompt = this.buildSubstitutionPrompt(ingredientName);
        const response = await this.sendRequest(prompt);
        return this.parseSubstitutionResponse(response, ingredientName);
    }
    /**
     * Chat with Menu Assistant (Sue)
     * Requirements: 16.1, 16.2 - AI-powered menu assistance
     */
    async chat(message, context) {
        if (!this.isEnabled()) {
            throw new Error('AI features are not enabled');
        }
        const prompt = this.buildChatPrompt(message, context);
        const response = await this.sendRequest(prompt);
        return response;
    }
    /**
     * Send request to AI provider
     */
    async sendRequest(prompt) {
        if (!this.config) {
            throw new Error('AI service not configured');
        }
        switch (this.config.provider) {
            case 'openai':
                return this.sendOpenAIRequest(prompt);
            case 'anthropic':
                return this.sendAnthropicRequest(prompt);
            case 'ollama':
                return this.sendOllamaRequest(prompt);
            case 'custom':
                return this.sendCustomRequest(prompt);
            default:
                throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }
    /**
     * Send request to OpenAI API
     */
    async sendOpenAIRequest(prompt) {
        const endpoint = this.getEndpoint();
        const model = this.getModel();
        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful cooking assistant that helps with recipe management.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }
        const data = (await response.json());
        return data.choices?.[0]?.message?.content || '';
    }
    /**
     * Send request to Anthropic API
     */
    async sendAnthropicRequest(prompt) {
        const endpoint = this.getEndpoint();
        const model = this.getModel();
        const response = await fetch(`${endpoint}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
                system: 'You are a helpful cooking assistant that helps with recipe management.',
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} - ${error}`);
        }
        const data = (await response.json());
        return data.content?.[0]?.text || '';
    }
    /**
     * Send request to Ollama API
     * Requirements: 11.4 - Local AI models without external API calls
     */
    async sendOllamaRequest(prompt) {
        const endpoint = this.getEndpoint();
        const model = this.getModel();
        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                system: 'You are a helpful cooking assistant that helps with recipe management.',
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }
        const data = (await response.json());
        return data.response || '';
    }
    /**
     * Send request to custom API endpoint
     */
    async sendCustomRequest(prompt) {
        const endpoint = this.getEndpoint();
        const model = this.getModel();
        // Custom endpoint follows OpenAI-compatible format
        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful cooking assistant that helps with recipe management.',
                    },
                    { role: 'user', content: prompt },
                ],
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Custom API error: ${response.status} - ${error}`);
        }
        const data = (await response.json());
        return data.choices?.[0]?.message?.content || '';
    }
    /**
     * Build prompt for recipe parsing
     */
    buildRecipeParsePrompt(html) {
        // Truncate HTML to avoid token limits
        const truncatedHtml = html.slice(0, 15000);
        return `Extract the recipe from the following HTML content. Return a JSON object with these fields:
- title: string (recipe name)
- description: string (optional, brief description)
- ingredients: string[] (list of ingredients with quantities)
- instructions: string[] (list of step-by-step instructions)
- prepTime: string (optional, ISO 8601 duration like "PT15M")
- cookTime: string (optional, ISO 8601 duration like "PT30M")
- servings: number (optional, number of servings)

Only return the JSON object, no other text.

HTML content:
${truncatedHtml}`;
    }
    /**
     * Parse recipe from AI response
     */
    parseRecipeResponse(response) {
        try {
            // Extract JSON from response (may be wrapped in markdown code blocks)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const data = JSON.parse(jsonMatch[0]);
            return {
                title: data.title || 'Untitled Recipe',
                description: data.description,
                ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
                instructions: Array.isArray(data.instructions) ? data.instructions : [],
                prepTime: data.prepTime ? this.parseISODuration(data.prepTime) : undefined,
                cookTime: data.cookTime ? this.parseISODuration(data.cookTime) : undefined,
                servings: typeof data.servings === 'number' ? data.servings : undefined,
            };
        }
        catch (error) {
            throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse ISO 8601 duration to Duration object
     */
    parseISODuration(iso) {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (!match)
            return undefined;
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        return { minutes: hours * 60 + minutes };
    }
    /**
     * Build prompt for tag suggestions
     */
    buildTagSuggestionPrompt(recipe) {
        const ingredientList = recipe.ingredients.map((i) => i.name).join(', ');
        const instructionSummary = recipe.instructions.map((i) => i.text).join(' ').slice(0, 500);
        return `Suggest tags for this recipe. Return a JSON array of objects with these fields:
- tag: string (tag name, lowercase)
- confidence: number (0-1, how confident you are)
- reason: string (brief explanation)

Consider these categories:
- Cuisine type (italian, mexican, asian, etc.)
- Meal type (breakfast, lunch, dinner, snack, dessert)
- Cooking method (grilled, baked, fried, slow-cooker, etc.)
- Dietary (vegan, vegetarian, gluten-free, etc.)
- Occasion (holiday, party, weeknight, etc.)
- Difficulty (easy, intermediate, advanced)
- Time (quick, 30-minute, meal-prep)

Recipe:
Title: ${recipe.title}
Description: ${recipe.description || 'N/A'}
Ingredients: ${ingredientList}
Instructions: ${instructionSummary}
Prep Time: ${recipe.prepTime.minutes} minutes
Cook Time: ${recipe.cookTime.minutes} minutes
Servings: ${recipe.servings}

Only return the JSON array, no other text.`;
    }
    /**
     * Parse tag suggestions from AI response
     */
    parseTagSuggestionResponse(response) {
        try {
            // Extract JSON array from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            const data = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(data)) {
                return [];
            }
            return data
                .filter((item) => typeof item === 'object' && item !== null && 'tag' in item && 'confidence' in item)
                .filter((item) => item.tag && typeof item.confidence === 'number')
                .map((item) => ({
                tag: String(item.tag).toLowerCase().trim(),
                confidence: Math.max(0, Math.min(1, item.confidence)),
                reason: String(item.reason || ''),
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Build prompt for substitution suggestions
     */
    buildSubstitutionPrompt(ingredientName) {
        return `Suggest substitutions for the ingredient "${ingredientName}" in cooking. Return a JSON array of objects with these fields:
- substitute: string (name of substitute ingredient)
- ratio: number (conversion ratio, e.g., 1.0 for 1:1)
- notes: string (optional, any important notes about the substitution)

Consider common dietary restrictions and availability. Only return the JSON array, no other text.`;
    }
    /**
     * Parse substitution suggestions from AI response
     */
    parseSubstitutionResponse(response, original) {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            const data = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(data)) {
                return [];
            }
            return data
                .filter((item) => typeof item === 'object' && item !== null && 'substitute' in item)
                .filter((item) => item.substitute)
                .map((item) => ({
                original,
                substitute: String(item.substitute),
                ratio: typeof item.ratio === 'number' ? item.ratio : 1.0,
                notes: item.notes ? String(item.notes) : undefined,
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Build prompt for chat with Menu Assistant
     */
    buildChatPrompt(message, context) {
        const recipeList = context.recipes
            .slice(0, 20)
            .map((r) => `- ${r.title} (${r.tags.join(', ')})`)
            .join('\n');
        const menuInfo = context.currentMenu
            ? `Current menu: ${context.currentMenu.name} (${context.currentMenu.startDate.toDateString()} - ${context.currentMenu.endDate.toDateString()})`
            : 'No menu currently being built';
        const preferences = context.preferences.dietaryRestrictions?.length
            ? `Dietary restrictions: ${context.preferences.dietaryRestrictions.join(', ')}`
            : 'No dietary restrictions';
        return `You are Sue, a friendly menu planning assistant. Help the user plan their meals.

Available recipes:
${recipeList}

${menuInfo}
${preferences}

User message: ${message}

Respond helpfully and suggest specific recipes from the available list when appropriate.`;
    }
}
//# sourceMappingURL=ai-service.js.map