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
import type { AIConfig, AIProvider } from '../types/ai.js';
import * as crypto from 'crypto';

/**
 * Configuration keys stored in the database
 */
const CONFIG_KEYS = {
  PROVIDER: 'provider',
  API_KEY: 'api_key_encrypted',
  ENDPOINT: 'endpoint',
  MODEL: 'model',
  ENCRYPTION_SALT: 'encryption_salt',
} as const;

/**
 * Encryption algorithm
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * AI Configuration Store
 * Handles secure storage and retrieval of AI configuration
 */
export class AIConfigStore {
  constructor(private db: Database) {}

  /**
   * Save AI configuration securely
   * Requirements: 11.5 - Store API keys securely
   */
  async saveConfig(config: AIConfig): Promise<void> {
    // Get or create encryption salt
    const salt = this.getOrCreateSalt();

    this.db.transaction(() => {
      // Clear existing config
      this.db.run('DELETE FROM ai_config');

      // Store provider
      this.db.run(
        'INSERT INTO ai_config (key, value) VALUES (?, ?)',
        [CONFIG_KEYS.PROVIDER, config.provider]
      );

      // Store API key (encrypted)
      if (config.apiKey) {
        const encryptedKey = this.encrypt(config.apiKey, salt);
        this.db.run(
          'INSERT INTO ai_config (key, value) VALUES (?, ?)',
          [CONFIG_KEYS.API_KEY, encryptedKey]
        );
      }

      // Store endpoint
      if (config.endpoint) {
        this.db.run(
          'INSERT INTO ai_config (key, value) VALUES (?, ?)',
          [CONFIG_KEYS.ENDPOINT, config.endpoint]
        );
      }

      // Store model
      if (config.model) {
        this.db.run(
          'INSERT INTO ai_config (key, value) VALUES (?, ?)',
          [CONFIG_KEYS.MODEL, config.model]
        );
      }

      // Store salt
      this.db.run(
        'INSERT INTO ai_config (key, value) VALUES (?, ?)',
        [CONFIG_KEYS.ENCRYPTION_SALT, salt]
      );
    });
  }

  /**
   * Load AI configuration from storage
   */
  async loadConfig(): Promise<AIConfig | null> {
    // Get provider
    const providerRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.PROVIDER]
    );

    if (!providerRow) {
      return null;
    }

    const provider = providerRow[0] as AIProvider;

    // Get salt for decryption
    const saltRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.ENCRYPTION_SALT]
    );

    const salt = saltRow?.[0] || this.getOrCreateSalt();

    // Get encrypted API key
    const apiKeyRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.API_KEY]
    );

    let apiKey: string | undefined;
    if (apiKeyRow) {
      try {
        apiKey = this.decrypt(apiKeyRow[0], salt);
      } catch {
        // Decryption failed - key may be corrupted
        apiKey = undefined;
      }
    }

    // Get endpoint
    const endpointRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.ENDPOINT]
    );

    // Get model
    const modelRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.MODEL]
    );

    return {
      provider,
      apiKey,
      endpoint: endpointRow?.[0],
      model: modelRow?.[0],
    };
  }

  /**
   * Clear all AI configuration
   */
  async clearConfig(): Promise<void> {
    this.db.run('DELETE FROM ai_config');
  }

  /**
   * Check if AI is configured
   */
  isConfigured(): boolean {
    const row = this.db.get<[number]>(
      'SELECT COUNT(*) FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.PROVIDER]
    );
    return (row?.[0] ?? 0) > 0;
  }

  /**
   * Get or create encryption salt
   */
  private getOrCreateSalt(): string {
    const existingRow = this.db.get<[string]>(
      'SELECT value FROM ai_config WHERE key = ?',
      [CONFIG_KEYS.ENCRYPTION_SALT]
    );

    if (existingRow) {
      return existingRow[0];
    }

    // Generate new salt
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Derive encryption key from salt and machine identifier
   */
  private deriveKey(salt: string): Buffer {
    // Use a combination of salt and a static identifier
    // In a real app, this would use machine-specific data
    const machineId = this.getMachineIdentifier();
    
    return crypto.pbkdf2Sync(
      machineId,
      salt,
      100000,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Get machine identifier for key derivation
   * In production, this would use actual machine-specific data
   */
  private getMachineIdentifier(): string {
    // Use a combination of environment variables and constants
    // This provides some level of machine binding
    const parts = [
      process.env.USER || 'default',
      process.env.HOME || '/home',
      'sous-chef-v1',
    ];
    return parts.join(':');
  }

  /**
   * Encrypt a string value
   */
  private encrypt(plaintext: string, salt: string): string {
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + auth tag + encrypted data
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }

  /**
   * Decrypt a string value
   */
  private decrypt(ciphertext: string, salt: string): string {
    const key = this.deriveKey(salt);
    
    // Extract IV, auth tag, and encrypted data
    const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(
      ciphertext.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2),
      'hex'
    );
    const encrypted = ciphertext.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
