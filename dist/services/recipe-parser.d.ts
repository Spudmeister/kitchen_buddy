/**
 * Recipe Parser Service for Sous Chef
 * Extracts recipe data from URLs and HTML using schema.org structured data
 */
import type { Unit, Duration } from '../types/units.js';
import type { IngredientCategory } from '../types/recipe.js';
/**
 * Parsed recipe from external source (raw strings, needs normalization)
 */
export interface ParsedRecipe {
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prepTime?: Duration;
    cookTime?: Duration;
    servings?: number;
    imageUrl?: string;
    sourceUrl?: string;
}
/**
 * Result of parsing attempt
 */
export interface ParseResult {
    success: boolean;
    recipe?: ParsedRecipe;
    confidence: number;
    source: 'schema.org' | 'ai' | 'manual';
    errors?: string[];
}
/**
 * Schema.org Recipe type (subset of fields we care about)
 */
interface SchemaOrgRecipe {
    '@type': 'Recipe' | string[];
    name?: string;
    description?: string;
    recipeIngredient?: string[];
    recipeInstructions?: SchemaOrgInstruction[] | string[] | string;
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string | number | string[];
    image?: string | {
        url?: string;
    } | string[] | {
        url?: string;
    }[];
}
/**
 * Schema.org HowToStep or HowToSection
 */
interface SchemaOrgInstruction {
    '@type'?: string;
    text?: string;
    name?: string;
    itemListElement?: SchemaOrgInstruction[];
}
/**
 * Extract schema.org Recipe data from HTML
 * Supports both JSON-LD and Microdata formats
 */
export declare function extractSchemaOrg(html: string): SchemaOrgRecipe | null;
/**
 * Convert schema.org recipe to ParsedRecipe
 */
export declare function schemaOrgToRecipe(schema: SchemaOrgRecipe, sourceUrl?: string): ParsedRecipe;
/**
 * Parse recipe from HTML content
 */
export declare function parseFromHtml(html: string, sourceUrl?: string): ParseResult;
/**
 * Options for parsing
 */
export interface ParseOptions {
    /** Timeout in milliseconds for URL fetch (default: 10000) */
    timeout?: number;
    /** User agent string to use for requests */
    userAgent?: string;
}
/**
 * Parse recipe from URL
 * Fetches the URL and extracts schema.org data
 */
export declare function parseFromUrl(url: string, options?: ParseOptions): Promise<ParseResult>;
/**
 * Normalized ingredient from parsing
 */
export interface NormalizedIngredient {
    name: string;
    quantity: number;
    unit: Unit;
    notes?: string;
    category?: IngredientCategory;
    /** Original raw string */
    raw: string;
}
/**
 * Normalize a raw ingredient string into structured data
 */
export declare function normalizeIngredient(raw: string): NormalizedIngredient;
/**
 * Normalize all ingredients from a parsed recipe
 */
export declare function normalizeIngredients(rawIngredients: string[]): NormalizedIngredient[];
/**
 * Extended parse options with AI support
 */
export interface ExtendedParseOptions extends ParseOptions {
    /** Whether to use AI as fallback when schema.org parsing fails */
    useAI?: boolean;
    /** AI service instance for AI-powered parsing */
    aiService?: {
        isEnabled(): boolean;
        parseRecipe(html: string): Promise<ParsedRecipe>;
    };
}
/**
 * Parse recipe from HTML with optional AI fallback
 * Requirements: 1.5, 1.6 - Schema.org first, AI fallback when enabled
 *
 * @param html - HTML content to parse
 * @param sourceUrl - Optional source URL
 * @param options - Parse options including AI service
 * @returns Parse result with recipe data
 */
export declare function parseFromHtmlWithAI(html: string, sourceUrl?: string, options?: ExtendedParseOptions): Promise<ParseResult>;
/**
 * Parse recipe from URL with optional AI fallback
 * Requirements: 1.5, 1.6 - Schema.org first, AI fallback when enabled
 *
 * @param url - URL to fetch and parse
 * @param options - Parse options including AI service
 * @returns Parse result with recipe data
 */
export declare function parseFromUrlWithAI(url: string, options?: ExtendedParseOptions): Promise<ParseResult>;
export {};
//# sourceMappingURL=recipe-parser.d.ts.map