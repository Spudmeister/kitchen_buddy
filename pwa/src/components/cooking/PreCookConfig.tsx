/**
 * Pre-Cook Configuration Component
 *
 * Allows users to adjust scale and units before starting Cook Mode.
 * Captures configuration for the cooking session.
 *
 * Requirements: 21.2, 21.3
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/ui-store';
import { ScaleControl } from '../ui/ScaleControl';
import { UnitToggle } from '../ui/UnitToggle';
import { XMarkIcon, PlayIcon, ClockIcon, UsersIcon } from '../icons';
import type { Recipe } from '../../types/recipe';
import type { UnitSystem } from '../../types/units';
import type { InstanceConfig } from '../../types/instance';

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Pre-Cook Configuration Props
 */
export interface PreCookConfigProps {
  /** Recipe to configure */
  recipe: Recipe;
  /** Callback when configuration is complete and cooking should start */
  onStart: (config: InstanceConfig) => void;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Pre-Cook Configuration Modal
 */
export function PreCookConfig({ recipe, onStart, onClose }: PreCookConfigProps) {
  const preferences = useUIStore((state) => state.preferences);

  // Configuration state
  const [servings, setServings] = useState(recipe.servings);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(preferences.unitSystem);

  // Calculate scale factor
  const scaleFactor = servings / recipe.servings;

  // Calculate scaled times
  const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;

  const handleStart = useCallback(() => {
    const config: InstanceConfig = {
      scaleFactor,
      unitSystem,
      servings,
    };
    onStart(config);
  }, [scaleFactor, unitSystem, servings, onStart]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Configure cooking session"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ready to Cook?
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Recipe info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {recipe.title}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {formatDuration(totalTime)}
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {recipe.servings} servings
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration options */}
        <div className="p-4 space-y-6">
          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How many servings?
            </label>
            <ScaleControl
              baseServings={recipe.servings}
              currentServings={servings}
              onChange={setServings}
              min={1}
              max={50}
            />
          </div>

          {/* Unit system */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Measurement units
            </label>
            <UnitToggle
              currentSystem={unitSystem}
              onChange={setUnitSystem}
              size="md"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <PlayIcon className="w-5 h-5" />
            Start Cooking
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook to manage pre-cook configuration flow
 */
export function usePreCookConfig() {
  const navigate = useNavigate();
  const [configRecipe, setConfigRecipe] = useState<Recipe | null>(null);

  const openConfig = useCallback((recipe: Recipe) => {
    setConfigRecipe(recipe);
  }, []);

  const closeConfig = useCallback(() => {
    setConfigRecipe(null);
  }, []);

  const startCooking = useCallback((config: InstanceConfig) => {
    if (!configRecipe) return;

    // Build URL with config params
    const params = new URLSearchParams();
    if (config.scaleFactor && config.scaleFactor !== 1) {
      params.set('scale', config.scaleFactor.toString());
    }
    if (config.unitSystem) {
      params.set('units', config.unitSystem);
    }

    const queryString = params.toString();
    const url = `/recipe/${configRecipe.id}/cook${queryString ? `?${queryString}` : ''}`;

    setConfigRecipe(null);
    navigate(url);
  }, [configRecipe, navigate]);

  return {
    configRecipe,
    openConfig,
    closeConfig,
    startCooking,
  };
}
