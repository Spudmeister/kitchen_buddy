/**
 * Recommendation Section Component
 *
 * Displays recipe recommendations in horizontal scrollable sections.
 * Supports different recommendation types: favorites, deep cuts,
 * recently added, and haven't made lately.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecipeCard, type QuickActionType } from '@components/recipe/RecipeCard';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import {
  StarIcon,
  ChartBarIcon,
  ClockIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@components/icons';
import type { Recipe } from '@/types/recipe';

/**
 * Recommendation type determines the section's content and styling
 */
export type RecommendationType = 'favorites' | 'deep-cuts' | 'recently-added' | 'not-cooked-recently';

/**
 * Configuration for each recommendation type
 */
const RECOMMENDATION_CONFIG: Record<
  RecommendationType,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    emptyMessage: string;
    iconColor: string;
    bgColor: string;
  }
> = {
  favorites: {
    title: 'Favorites',
    description: 'Highly-rated and frequently-cooked',
    icon: StarIcon,
    emptyMessage: 'Rate and cook more recipes to see your favorites here',
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  'deep-cuts': {
    title: 'Deep Cuts',
    description: 'Well-rated but rarely-cooked gems',
    icon: ChartBarIcon,
    emptyMessage: 'Rate more recipes to discover hidden gems',
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  'recently-added': {
    title: 'Recently Added',
    description: 'Your newest recipes',
    icon: BookOpenIcon,
    emptyMessage: 'Add some recipes to see them here',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'not-cooked-recently': {
    title: "Haven't Made Lately",
    description: 'Recipes waiting to be rediscovered',
    icon: ClockIcon,
    emptyMessage: 'Cook more recipes to see suggestions here',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
};

/**
 * Props for RecommendationSection
 */
export interface RecommendationSectionProps {
  type: RecommendationType;
  recipes: Recipe[];
  isLoading?: boolean;
  onRecipeTap?: (recipe: Recipe) => void;
  onQuickAction?: (recipe: Recipe, action: QuickActionType) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

/**
 * Empty state component for when no recommendations are available
 */
function EmptyState({ message, icon: Icon, iconColor, bgColor }: {
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className={`p-3 rounded-full ${bgColor} mb-3`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {message}
      </p>
    </div>
  );
}

/**
 * Recommendation Section Component
 *
 * Displays a horizontal scrollable list of recipe recommendations
 * with a header showing the recommendation type.
 */
export function RecommendationSection({
  type,
  recipes,
  isLoading = false,
  onRecipeTap,
  onQuickAction,
  showViewAll = false,
  onViewAll,
}: RecommendationSectionProps) {
  const navigate = useNavigate();
  const config = RECOMMENDATION_CONFIG[type];

  const handleRecipeTap = useCallback(
    (recipe: Recipe) => {
      if (onRecipeTap) {
        onRecipeTap(recipe);
      } else {
        // Default: navigate to recipe detail
        navigate(`/recipe/${recipe.id}`);
      }
    },
    [onRecipeTap, navigate]
  );

  const handleQuickAction = useCallback(
    (recipe: Recipe, action: QuickActionType) => {
      if (onQuickAction) {
        onQuickAction(recipe, action);
      }
      // Default quick action handling is done by RecipeCard
    },
    [onQuickAction]
  );

  return (
    <section className="space-y-3" aria-labelledby={`${type}-heading`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
            <config.icon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
          <div>
            <h3
              id={`${type}-heading`}
              className="font-semibold text-gray-900 dark:text-white text-sm"
            >
              {config.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </div>
        </div>
        {showViewAll && recipes.length > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            aria-label={`View all ${config.title.toLowerCase()}`}
          >
            View all
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          message={config.emptyMessage}
          icon={config.icon}
          iconColor={config.iconColor}
          bgColor={config.bgColor}
        />
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
          role="list"
          aria-label={`${config.title} recipes`}
        >
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex-shrink-0 w-48"
              role="listitem"
            >
              <RecipeCard
                recipe={recipe}
                variant="standard"
                showQuickActions
                onTap={() => handleRecipeTap(recipe)}
                onQuickAction={(action) => handleQuickAction(recipe, action)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Props for RecommendationsView
 */
export interface RecommendationsViewProps {
  favorites: Recipe[];
  deepCuts: Recipe[];
  recentlyAdded: Recipe[];
  notCookedRecently: Recipe[];
  isLoading?: {
    favorites?: boolean;
    deepCuts?: boolean;
    recentlyAdded?: boolean;
    notCookedRecently?: boolean;
  };
  onRecipeTap?: (recipe: Recipe) => void;
  onQuickAction?: (recipe: Recipe, action: QuickActionType) => void;
}

/**
 * Combined Recommendations View
 *
 * Displays all recommendation sections in a single view.
 * Used in the Planning View and dedicated Recommendations page.
 */
export function RecommendationsView({
  favorites,
  deepCuts,
  recentlyAdded,
  notCookedRecently,
  isLoading = {},
  onRecipeTap,
  onQuickAction,
}: RecommendationsViewProps) {
  return (
    <div className="space-y-6">
      <RecommendationSection
        type="favorites"
        recipes={favorites}
        isLoading={isLoading.favorites}
        onRecipeTap={onRecipeTap}
        onQuickAction={onQuickAction}
      />
      <RecommendationSection
        type="deep-cuts"
        recipes={deepCuts}
        isLoading={isLoading.deepCuts}
        onRecipeTap={onRecipeTap}
        onQuickAction={onQuickAction}
      />
      <RecommendationSection
        type="recently-added"
        recipes={recentlyAdded}
        isLoading={isLoading.recentlyAdded}
        onRecipeTap={onRecipeTap}
        onQuickAction={onQuickAction}
      />
      <RecommendationSection
        type="not-cooked-recently"
        recipes={notCookedRecently}
        isLoading={isLoading.notCookedRecently}
        onRecipeTap={onRecipeTap}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}
