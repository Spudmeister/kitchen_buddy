import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipe } from '../hooks/useRecipes';
import { useCookStats } from '../hooks/useCookSessions';
import { RecipeDetail as RecipeDetailComponent } from '../components/recipe';
import { PreCookConfig } from '../components/cooking';
import { LoadingSpinner } from '../components/ui';
import type { InstanceConfig } from '../types/instance';

/**
 * Recipe Detail View
 *
 * Full recipe view with all capabilities.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 21.2, 21.3, 23.6
 */
export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const { data: cookStats } = useCookStats(id);
  const [showPreCookConfig, setShowPreCookConfig] = useState(false);

  // Handle starting cook mode with configuration
  const handleStartCooking = useCallback((config: InstanceConfig) => {
    if (!recipe) return;

    // Build URL with config params
    const params = new URLSearchParams();
    if (config.scaleFactor && config.scaleFactor !== 1) {
      params.set('scale', config.scaleFactor.toString());
    }
    if (config.unitSystem) {
      params.set('units', config.unitSystem);
    }

    const queryString = params.toString();
    const url = `/recipe/${recipe.id}/cook${queryString ? `?${queryString}` : ''}`;

    setShowPreCookConfig(false);
    navigate(url);
  }, [recipe, navigate]);

  // Handle cook now - show pre-cook config
  const handleCookNow = useCallback(() => {
    setShowPreCookConfig(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Recipe Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error instanceof Error ? error.message : 'The recipe you are looking for does not exist.'}
        </p>
        <button
          onClick={() => navigate('/plan')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Go to Planning
        </button>
      </div>
    );
  }

  return (
    <>
      <RecipeDetailComponent
        recipe={recipe}
        cookStats={cookStats}
        onBack={() => navigate(-1)}
        onCookNow={handleCookNow}
        onAddToMenu={() => {
          // TODO: Open add to menu modal
        }}
        onShare={() => {
          // TODO: Implement share functionality
        }}
        onDuplicate={() => {
          // TODO: Implement duplicate functionality
        }}
      />

      {/* Pre-cook configuration modal */}
      {showPreCookConfig && (
        <PreCookConfig
          recipe={recipe}
          onStart={handleStartCooking}
          onClose={() => setShowPreCookConfig(false)}
        />
      )}
    </>
  );
}
