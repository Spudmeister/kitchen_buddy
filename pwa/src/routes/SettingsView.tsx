/**
 * Settings View
 * 
 * App configuration and preferences.
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore, type UserPreferences } from '@stores/ui-store';
import type { UnitSystem } from '../types/units';

/**
 * Section component for grouping settings
 */
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
}

/**
 * Setting row component
 */
function SettingRow({ 
  label, 
  description, 
  children 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1 mr-4">
        <div className="text-gray-900 dark:text-white font-medium">{label}</div>
        {description && (
          <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/**
 * Select component for settings
 */
function SettingSelect<T extends string>({ 
  value, 
  onChange, 
  options 
}: { 
  value: T; 
  onChange: (value: T) => void; 
  options: { value: T; label: string }[] 
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

/**
 * Number input component for settings
 */
function SettingNumber({ 
  value, 
  onChange, 
  min, 
  max 
}: { 
  value: number; 
  onChange: (value: number) => void; 
  min?: number; 
  max?: number 
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || min || 1)}
      min={min}
      max={max}
      className="w-20 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm text-center"
    />
  );
}

export default function SettingsView() {
  const { preferences, updatePreferences, showToast } = useUIStore();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'local'>('openai');

  // Apply theme on change
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  // Apply text size on change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    switch (preferences.textSize) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
      default:
        root.classList.add('text-base');
    }
  }, [preferences.textSize]);

  // Load AI config from localStorage
  useEffect(() => {
    const savedAiConfig = localStorage.getItem('sous-chef-ai-config');
    if (savedAiConfig) {
      try {
        const config = JSON.parse(savedAiConfig);
        setAiEnabled(config.enabled || false);
        setAiProvider(config.provider || 'openai');
        setAiApiKey(config.apiKey || '');
      } catch {
        // Invalid config, ignore
      }
    }
  }, []);

  const handleUpdatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    updatePreferences({ [key]: value });
    showToast({ type: 'success', message: 'Setting updated', duration: 2000 });
  };

  const handleSaveAiConfig = () => {
    const config = {
      enabled: aiEnabled,
      provider: aiProvider,
      apiKey: aiApiKey,
    };
    localStorage.setItem('sous-chef-ai-config', JSON.stringify(config));
    showToast({ type: 'success', message: 'AI configuration saved', duration: 2000 });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* Cooking Preferences */}
      <SettingsSection title="Cooking Preferences">
        <SettingRow 
          label="Default Unit System" 
          description="Used when viewing recipes"
        >
          <SettingSelect<UnitSystem>
            value={preferences.unitSystem}
            onChange={(value) => handleUpdatePreference('unitSystem', value)}
            options={[
              { value: 'us', label: 'US (cups, oz)' },
              { value: 'metric', label: 'Metric (ml, g)' },
            ]}
          />
        </SettingRow>

        <SettingRow 
          label="Default Servings" 
          description="Starting servings when scaling recipes"
        >
          <SettingNumber
            value={preferences.defaultServings}
            onChange={(value) => handleUpdatePreference('defaultServings', Math.max(1, Math.min(100, value)))}
            min={1}
            max={100}
          />
        </SettingRow>

        <SettingRow 
          label="Leftover Duration" 
          description="Days until leftovers expire"
        >
          <SettingNumber
            value={preferences.leftoverDurationDays}
            onChange={(value) => handleUpdatePreference('leftoverDurationDays', Math.max(1, Math.min(14, value)))}
            min={1}
            max={14}
          />
        </SettingRow>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection title="Appearance">
        <SettingRow 
          label="Theme" 
          description="App color scheme"
        >
          <SettingSelect<UserPreferences['theme']>
            value={preferences.theme}
            onChange={(value) => handleUpdatePreference('theme', value)}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </SettingRow>

        <SettingRow 
          label="Text Size" 
          description="Adjust text size throughout the app"
        >
          <SettingSelect<UserPreferences['textSize']>
            value={preferences.textSize}
            onChange={(value) => handleUpdatePreference('textSize', value)}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </SettingRow>
      </SettingsSection>

      {/* AI Configuration */}
      <SettingsSection title="AI Assistant (Sue)">
        <SettingRow 
          label="Enable AI Features" 
          description="Use AI for recipe suggestions and menu planning"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
          </label>
        </SettingRow>

        {aiEnabled && (
          <>
            <SettingRow 
              label="AI Provider" 
              description="Select your AI service provider"
            >
              <SettingSelect<'openai' | 'anthropic' | 'local'>
                value={aiProvider}
                onChange={setAiProvider}
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic' },
                  { value: 'local', label: 'Local (Ollama)' },
                ]}
              />
            </SettingRow>

            <div className="p-4">
              <label className="block text-gray-900 dark:text-white font-medium mb-2">
                API Key
              </label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your API key is stored locally and never sent to our servers.
              </p>
              <button
                onClick={handleSaveAiConfig}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                Save AI Configuration
              </button>
            </div>
          </>
        )}
      </SettingsSection>

      {/* Data Management */}
      <SettingsSection title="Data Management">
        <Link 
          to="/settings/data"
          className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <div>
            <div className="text-gray-900 dark:text-white font-medium">Export & Import Data</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Backup your recipes, menus, and settings
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <div className="p-4">
          <div className="text-gray-900 dark:text-white font-medium">Sous Chef</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your personal recipe manager and cooking assistant.
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
