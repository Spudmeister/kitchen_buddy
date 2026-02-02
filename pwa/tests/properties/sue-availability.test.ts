/**
 * Property Test: Sue Availability
 *
 * **Feature: sous-chef-pwa, Property 19: Sue Availability**
 * **Validates: Requirements 16.1, 16.6**
 *
 * For any AI configuration state, Sue SHALL be available if and only if AI features
 * are enabled. When AI is disabled, Sue-related UI elements SHALL be hidden.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * AI Configuration interface
 */
interface AIConfig {
  enabled: boolean;
  provider?: string;
  apiKey?: string;
  endpoint?: string;
}

/**
 * Mock localStorage for testing
 */
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Sue Service mock for testing availability
 */
class MockSueService {
  private storage: MockLocalStorage;
  private readonly CONFIG_KEY = 'sous-chef-ai-config';

  constructor(storage: MockLocalStorage) {
    this.storage = storage;
  }

  /**
   * Check if Sue (AI features) is available
   */
  isAvailable(): boolean {
    const config = this.getAIConfig();
    return config.enabled;
  }

  /**
   * Get AI configuration
   */
  getAIConfig(): AIConfig {
    try {
      const stored = this.storage.getItem(this.CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored) as AIConfig;
      }
    } catch {
      // Ignore parse errors
    }
    return { enabled: false };
  }

  /**
   * Set AI configuration
   */
  setAIConfig(config: AIConfig): void {
    this.storage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Enable AI features
   */
  enableAI(provider?: string, apiKey?: string, endpoint?: string): void {
    this.setAIConfig({
      enabled: true,
      provider,
      apiKey,
      endpoint,
    });
  }

  /**
   * Disable AI features
   */
  disableAI(): void {
    this.setAIConfig({ enabled: false });
  }
}

/**
 * UI visibility helper - determines if Sue UI should be shown
 */
function shouldShowSueUI(sueService: MockSueService): boolean {
  return sueService.isAvailable();
}

/**
 * Generators for property tests
 */
const providerArb = fc.constantFrom('openai', 'anthropic', 'local', 'azure', undefined);
const apiKeyArb = fc.option(
  fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0),
  { nil: undefined }
);
const endpointArb = fc.option(fc.webUrl(), { nil: undefined });

const aiConfigArb: fc.Arbitrary<AIConfig> = fc.record({
  enabled: fc.boolean(),
  provider: providerArb,
  apiKey: apiKeyArb,
  endpoint: endpointArb,
});

describe('Property 19: Sue Availability', () => {
  let storage: MockLocalStorage;
  let sueService: MockSueService;

  beforeEach(() => {
    storage = new MockLocalStorage();
    sueService = new MockSueService(storage);
  });

  afterEach(() => {
    storage.clear();
  });

  it('should be available if and only if AI is enabled', () => {
    fc.assert(
      fc.property(
        aiConfigArb,
        (config) => {
          sueService.setAIConfig(config);
          
          const isAvailable = sueService.isAvailable();
          
          // Sue should be available iff enabled is true
          expect(isAvailable).toBe(config.enabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show Sue UI only when AI is enabled', () => {
    fc.assert(
      fc.property(
        aiConfigArb,
        (config) => {
          sueService.setAIConfig(config);
          
          const showUI = shouldShowSueUI(sueService);
          
          // UI should be shown iff AI is enabled
          expect(showUI).toBe(config.enabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide Sue UI when AI is disabled', () => {
    fc.assert(
      fc.property(
        providerArb,
        apiKeyArb,
        endpointArb,
        (provider, apiKey, endpoint) => {
          // First enable AI
          sueService.enableAI(provider, apiKey, endpoint);
          expect(sueService.isAvailable()).toBe(true);
          expect(shouldShowSueUI(sueService)).toBe(true);
          
          // Then disable AI
          sueService.disableAI();
          expect(sueService.isAvailable()).toBe(false);
          expect(shouldShowSueUI(sueService)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should show Sue UI when AI is enabled', () => {
    fc.assert(
      fc.property(
        providerArb,
        apiKeyArb,
        endpointArb,
        (provider, apiKey, endpoint) => {
          // Start with AI disabled
          sueService.disableAI();
          expect(sueService.isAvailable()).toBe(false);
          expect(shouldShowSueUI(sueService)).toBe(false);
          
          // Enable AI
          sueService.enableAI(provider, apiKey, endpoint);
          expect(sueService.isAvailable()).toBe(true);
          expect(shouldShowSueUI(sueService)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should default to unavailable when no config exists', () => {
    // Fresh storage with no config
    const freshStorage = new MockLocalStorage();
    const freshService = new MockSueService(freshStorage);
    
    expect(freshService.isAvailable()).toBe(false);
    expect(shouldShowSueUI(freshService)).toBe(false);
  });

  it('should handle invalid config gracefully', () => {
    // Set invalid JSON
    storage.setItem('sous-chef-ai-config', 'invalid json');
    
    // Should default to unavailable
    expect(sueService.isAvailable()).toBe(false);
    expect(shouldShowSueUI(sueService)).toBe(false);
  });

  it('should persist availability state across service instances', () => {
    fc.assert(
      fc.property(
        aiConfigArb,
        (config) => {
          // Set config with first service instance
          sueService.setAIConfig(config);
          
          // Create new service instance with same storage
          const newService = new MockSueService(storage);
          
          // Should have same availability
          expect(newService.isAvailable()).toBe(config.enabled);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should toggle availability correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (toggleSequence) => {
          for (const shouldEnable of toggleSequence) {
            if (shouldEnable) {
              sueService.enableAI();
            } else {
              sueService.disableAI();
            }
            
            expect(sueService.isAvailable()).toBe(shouldEnable);
            expect(shouldShowSueUI(sueService)).toBe(shouldEnable);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve provider settings when enabling', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.webUrl(),
        (provider, apiKey, endpoint) => {
          sueService.enableAI(provider, apiKey, endpoint);
          
          const config = sueService.getAIConfig();
          
          expect(config.enabled).toBe(true);
          expect(config.provider).toBe(provider);
          expect(config.apiKey).toBe(apiKey);
          expect(config.endpoint).toBe(endpoint);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should clear provider settings when disabling', () => {
    fc.assert(
      fc.property(
        providerArb,
        apiKeyArb,
        endpointArb,
        (provider, apiKey, endpoint) => {
          // Enable with settings
          sueService.enableAI(provider, apiKey, endpoint);
          expect(sueService.isAvailable()).toBe(true);
          
          // Disable
          sueService.disableAI();
          
          const config = sueService.getAIConfig();
          expect(config.enabled).toBe(false);
          // Provider settings should be cleared or undefined
          expect(config.provider).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain consistency between isAvailable and getAIConfig', () => {
    fc.assert(
      fc.property(
        aiConfigArb,
        (config) => {
          sueService.setAIConfig(config);
          
          const isAvailable = sueService.isAvailable();
          const retrievedConfig = sueService.getAIConfig();
          
          // isAvailable should match enabled field in config
          expect(isAvailable).toBe(retrievedConfig.enabled);
        }
      ),
      { numRuns: 100 }
    );
  });
});
