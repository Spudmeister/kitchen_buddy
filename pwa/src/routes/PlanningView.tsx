/**
 * Planning View - "What should we eat?"
 *
 * Entry point for menu planning flow.
 * Displays current menu as calendar/timeline, surfaces discovery options,
 * and shows getting-started suggestions when empty.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 17.1, 17.2, 17.3, 17.4
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCurrentMenu,
  useCreateMenu,
  useAssignRecipe,
  useAssignLeftover,
  useExpiringLeftovers,
} from '@hooks/useMenus';
import {
  useFavorites,
  useRecentlyAdded,
} from '@hooks/useRecommendations';
import {
  MenuCalendar,
  RecipePicker,
  EmptyMenuState,
  CreateMenuModal,
  RecommendationSection,
} from '@components/planning';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { useUIStore } from '@stores/ui-store';
import {
  BeakerIcon,
  PlusIcon,
  StarIcon,
  BookOpenIcon,
} from '@components/icons';
import type { MealSlot, AvailableLeftover } from '@/types/menu';
import type { Recipe } from '@/types/recipe';
import type { QuickActionType } from '@components/recipe/RecipeCard';

/**
 * Discovery option card component
 */
function DiscoveryCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors w-full ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
    </button>
  );
}

/**
 * Leftover expiry warning component
 * Requirements: 17.2 - Highlight recipes with expiring leftovers
 */
function LeftoverWarnings({ 
  menuId,
  onUseLeftover,
}: { 
  menuId: string;
  onUseLeftover?: (leftover: AvailableLeftover) => void;
}) {
  const { data: expiringLeftovers = [] } = useExpiringLeftovers(menuId, 2);

  if (expiringLeftovers.length === 0) return null;

  const expiresToday = expiringLeftovers.filter(l => l.daysUntilExpiry === 0);
  const expiresTomorrow = expiringLeftovers.filter(l => l.daysUntilExpiry === 1);
  const expiresIn2Days = expiringLeftovers.filter(l => l.daysUntilExpiry === 2);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <h4 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-3">
        <span>⚠️</span>
        Leftovers Expiring Soon
      </h4>
      
      <div className="space-y-2">
        {expiresToday.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
              Expires Today:
            </p>
            <div className="flex flex-wrap gap-2">
              {expiresToday.map((leftover) => (
                <LeftoverChip
                  key={leftover.assignment.id}
                  leftover={leftover}
                  urgency="high"
                  onClick={onUseLeftover ? () => onUseLeftover(leftover) : undefined}
                />
              ))}
            </div>
          </div>
        )}
        
        {expiresTomorrow.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
              Expires Tomorrow:
            </p>
            <div className="flex flex-wrap gap-2">
              {expiresTomorrow.map((leftover) => (
                <LeftoverChip
                  key={leftover.assignment.id}
                  leftover={leftover}
                  urgency="medium"
                  onClick={onUseLeftover ? () => onUseLeftover(leftover) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {expiresIn2Days.length > 0 && (
          <div>
            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              Expires in 2 Days:
            </p>
            <div className="flex flex-wrap gap-2">
              {expiresIn2Days.map((leftover) => (
                <LeftoverChip
                  key={leftover.assignment.id}
                  leftover={leftover}
                  urgency="low"
                  onClick={onUseLeftover ? () => onUseLeftover(leftover) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Leftover chip component for quick actions
 */
function LeftoverChip({
  leftover,
  urgency,
  onClick,
}: {
  leftover: AvailableLeftover;
  urgency: 'high' | 'medium' | 'low';
  onClick?: () => void;
}) {
  const urgencyStyles = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    low: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${urgencyStyles[urgency]} ${
        onClick ? 'hover:opacity-80 cursor-pointer' : ''
      }`}
    >
      <span>🍱</span>
      <span className="truncate max-w-[120px]">{leftover.recipeTitle || 'Leftover'}</span>
      {onClick && <span className="text-[10px]">+ Use</span>}
    </Component>
  );
}

/**
 * Planning View Component
 */
export default function PlanningView() {
  const navigate = useNavigate();
  const showToast = useUIStore((state) => state.showToast);

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    date: Date;
    mealSlot: MealSlot;
  }>({
    isOpen: false,
    date: new Date(),
    mealSlot: 'dinner',
  });

  // Data
  const { data: currentMenu, isLoading } = useCurrentMenu();
  const createMenu = useCreateMenu();
  const assignRecipe = useAssignRecipe();
  const assignLeftover = useAssignLeftover();

  // Recommendations data (preview - limited to 5 items)
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites(5);
  const { data: recentlyAdded = [], isLoading: recentlyAddedLoading } = useRecentlyAdded(5);

  // Handlers
  const handleCreateMenu = useCallback(
    (name: string, startDate: Date, endDate: Date) => {
      createMenu.mutate(
        { name, startDate, endDate },
        {
          onSuccess: () => {
            showToast({ type: 'success', message: 'Menu created!' });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to create menu',
            });
          },
        }
      );
    },
    [createMenu, showToast]
  );

  const handleSlotTap = useCallback((date: Date, slot: MealSlot) => {
    setPickerState({ isOpen: true, date, mealSlot: slot });
  }, []);

  const handleRecipeSelect = useCallback(
    (recipe: Recipe) => {
      if (!currentMenu) return;

      assignRecipe.mutate(
        {
          menuId: currentMenu.id,
          input: {
            recipeId: recipe.id,
            date: pickerState.date,
            mealSlot: pickerState.mealSlot,
          },
        },
        {
          onSuccess: () => {
            showToast({ type: 'success', message: `Added ${recipe.title} to menu` });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to add recipe',
            });
          },
        }
      );
    },
    [currentMenu, pickerState, assignRecipe, showToast]
  );

  /**
   * Handle selecting a leftover from the picker
   * Requirements: 17.4 - Allow marking meal as "leftovers from [recipe]"
   */
  const handleLeftoverSelect = useCallback(
    (leftover: AvailableLeftover) => {
      if (!currentMenu) return;

      assignLeftover.mutate(
        {
          menuId: currentMenu.id,
          sourceAssignmentId: leftover.assignment.id,
          date: pickerState.date,
          mealSlot: pickerState.mealSlot,
        },
        {
          onSuccess: () => {
            showToast({ 
              type: 'success', 
              message: `Added leftovers from ${leftover.recipeTitle || 'recipe'} to menu` 
            });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to add leftover',
            });
          },
        }
      );
    },
    [currentMenu, pickerState, assignLeftover, showToast]
  );

  /**
   * Handle using a leftover from the warning section
   * Opens the picker with the leftover pre-selected for today
   */
  const handleUseLeftoverFromWarning = useCallback(
    (_leftover: AvailableLeftover) => {
      if (!currentMenu) return;

      // Open picker for today's dinner with the leftover context
      setPickerState({
        isOpen: true,
        date: new Date(),
        mealSlot: 'dinner',
      });
    },
    [currentMenu]
  );

  // Handle recommendation recipe tap - navigate to Recipe Detail
  const handleRecommendationTap = useCallback(
    (recipe: Recipe) => {
      navigate(`/recipe/${recipe.id}`);
    },
    [navigate]
  );

  // Handle quick actions on recommendation cards
  const handleQuickAction = useCallback(
    (recipe: Recipe, action: QuickActionType) => {
      switch (action) {
        case 'cook-now':
          navigate(`/recipe/${recipe.id}/cook`);
          break;
        case 'add-to-menu':
          if (currentMenu) {
            assignRecipe.mutate(
              {
                menuId: currentMenu.id,
                input: {
                  recipeId: recipe.id,
                  date: new Date(),
                  mealSlot: 'dinner',
                },
              },
              {
                onSuccess: () => {
                  showToast({ type: 'success', message: `Added ${recipe.title} to menu` });
                },
                onError: (error) => {
                  showToast({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Failed to add to menu',
                  });
                },
              }
            );
          }
          break;
        case 'edit':
          navigate(`/recipe/${recipe.id}/edit`);
          break;
        default:
          // Other actions handled by RecipeCard defaults
          break;
      }
    },
    [navigate, currentMenu, assignRecipe, showToast]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Empty state - no menu exists
  if (!currentMenu) {
    return (
      <>
        <EmptyMenuState onCreateMenu={() => setShowCreateModal(true)} />
        <CreateMenuModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMenu}
        />
      </>
    );
  }

  // Main planning view with menu
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            What should we eat this week?
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Menu
        </button>
      </div>

      {/* Leftover warnings - Requirements: 17.2 */}
      <LeftoverWarnings 
        menuId={currentMenu.id} 
        onUseLeftover={handleUseLeftoverFromWarning}
      />

      {/* Menu Calendar */}
      <MenuCalendar menu={currentMenu} onSlotTap={handleSlotTap} />

      {/* Discovery Options */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Discover Recipes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <DiscoveryCard
            icon={StarIcon}
            title="Recommendations"
            description="Based on your favorites and history"
            onClick={() => navigate('/plan/recommendations')}
          />
          <DiscoveryCard
            icon={BeakerIcon}
            title="Brainstorm"
            description="Find recipes by ingredients"
            onClick={() => navigate('/plan/brainstorm')}
          />
          <DiscoveryCard
            icon={BookOpenIcon}
            title="Browse Library"
            description="Explore all your recipes"
            onClick={() => navigate('/search')}
          />
        </div>
      </div>

      {/* Recommendations Preview */}
      <div className="space-y-6">
        {/* Favorites Section */}
        <RecommendationSection
          type="favorites"
          recipes={favorites}
          isLoading={favoritesLoading}
          onRecipeTap={handleRecommendationTap}
          onQuickAction={handleQuickAction}
          showViewAll
          onViewAll={() => navigate('/plan/recommendations')}
        />

        {/* Recently Added Section */}
        <RecommendationSection
          type="recently-added"
          recipes={recentlyAdded}
          isLoading={recentlyAddedLoading}
          onRecipeTap={handleRecommendationTap}
          onQuickAction={handleQuickAction}
          showViewAll
          onViewAll={() => navigate('/plan/recommendations')}
        />
      </div>

      {/* Recipe Picker Modal - Requirements: 17.3, 17.4 */}
      <RecipePicker
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState((prev) => ({ ...prev, isOpen: false }))}
        onSelect={handleRecipeSelect}
        onSelectLeftover={handleLeftoverSelect}
        date={pickerState.date}
        mealSlot={pickerState.mealSlot}
        menuId={currentMenu.id}
      />

      {/* Create Menu Modal */}
      <CreateMenuModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateMenu}
      />
    </div>
  );
}
