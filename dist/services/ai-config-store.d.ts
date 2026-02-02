/**
 * AI Configuration Store for Sous Chef
 * Provides secure storage for AI configuration including API keys
 *
 * Requirements: 11.5 - Store API keys securely in local configuration
 *
 * Security approach:
 * - API keys are encrypted before storage using AES-256-GCM
 * - Encryption key is derived from a machine-specific identifier
 * - Configuration is stored in the ai_config table
 */
import type { Database } from '../db/database.js';
import type { AIConfig } from '../types/ai.js';
/**
 * AI Configuration Store
 * Handles secure storage and retrieval of AI configuration
 */
export declare class AIConfigStore {
    private db;
    constructor(db: Database);
    /**
     * Save AI configuration securely
     * Requirements: 11.5 - Store API keys securely
     */
    saveConfig(config: AIConfig): Promise<void>;
    /**
     * Load AI configuration from storage
     */
    loadConfig(): Promise<AIConfig | null>;
    /**
     * Clear all AI configuration
     */
    clearConfig(): Promise<void>;
    /**
     * Check if AI is configured
     */
    isConfigured(): boolean;
    /**
     * Get or create encryption salt
     */
    private getOrCreateSalt;
    /**
     * Derive encryption key from salt and machine identifier
     */
    private deriveKey;
    /**
     * Get machine identifier for key derivation
     * In production, this would use actual machine-specific data
     */
    private getMachineIdentifier;
    /**
     * Encrypt a string value
     */
    private encrypt;
    /**
     * Decrypt a string value
     */
    private decrypt;
}
//# sourceMappingURL=ai-config-store.d.ts.map