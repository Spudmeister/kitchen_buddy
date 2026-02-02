/**
 * Search View - Recipe Library with search, filter, and sort
 * 
 * Full-page recipe library with real-time search, filtering, and sorting.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RecipeLibrary } from '../components/library/RecipeLibrary';
import { SearchInput } from '../components/library/SearchInput';
import { FilterPanel } from '../components/library/FilterPanel';
import { SortControl } from '../components/library/SortControl';
import { useArchiveRecipe, useDuplicateRecipe } from '../hooks/useRecipes';
import { useUIStore } from '../stores/ui-store';
import type { Recipe } from '../types/recipe';
import type { RecipeFilters, RecipeSort, RecipeSortOption } from '../types/search';
import type { QuickActionType } from '../components/recipe/RecipeCard';
import { FunnelIcon } from '../components/icons';

/**
 * Search View Component
 */
export default function SearchView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showToast = useUIStore((state) => state.showToast);
  
  // Parse URL params for initial state
  const initialQuery = searchParams.get('q') || '';
  const initialSort = (searchParams.get('sort') as RecipeSortOption) || 'date_added';
  const initialSortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'desc';
  
  // Local state
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    query: initialQuery,
  });
  const [sort, setSort] = useState<RecipeSort>({
    field: initialSort,
    direction: initialSortDir,
  });

  // Mutations
  const archiveRecipe = useArchiveRecipe();
  const duplicateRecipe = useDuplicateRecipe();

  // Update URL when search changes
  const updateSearchParams = useCallback((newQuery: string, newSort: RecipeSort) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (newSort.field !== 'date_added') params.set('sort', newSort.field);
    if (newSort.direction !== 'desc') params.set('dir', newSort.direction);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Handle search query change
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setFilters(prev => ({ ...prev, query: newQuery }));
    updateSearchParams(newQuery, sort);
  }, [sort, updateSearchParams]);

  // Handle sort change
  const handleSortChange = useCallback((newSort: RecipeSort) => {
    setSort(newSort);
    updateSearchParams(query, newSort);
  }, [query, updateSearchParams]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: Partial<RecipeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handle recipe selection
  const handleRecipeSelect = useCallback((recipe: Recipe) => {
    navigate(`/recipe/${recipe.id}`);
  }, [navigate]);

  // Handle quick actions
  const handleQuickAction = useCallback((recipe: Recipe, action: QuickActionType) => {
    switch (action) {
      case 'cook-now':
        navigate(`/recipe/${recipe.id}/cook`);
        break;
      case 'add-to-menu':
        // TODO: Open menu picker modal
        showToast({ type: 'info', message: 'Add to menu coming soon!' });
        break;
      case 'scale':
        navigate(`/recipe/${recipe.id}?scale=true`);
        break;
      case 'share':
        // TODO: Implement share
        showToast({ type: 'info', message: 'Share coming soon!' });
        break;
      case 'edit':
        navigate(`/recipe/${recipe.id}/edit`);
        break;
      case 'duplicate':
        duplicateRecipe.mutate(recipe.id, {
          onSuccess: (newRecipe) => {
            showToast({ type: 'success', message: `Created "${newRecipe.title}"` });
            navigate(`/recipe/${newRecipe.id}`);
          },
          onError: () => {
            showToast({ type: 'error', message: 'Failed to duplicate recipe' });
          },
        });
        break;
      case 'delete':
        archiveRecipe.mutate(recipe.id, {
          onSuccess: () => {
            showToast({ type: 'success', message: `"${recipe.title}" moved to archive` });
          },
          onError: () => {
            showToast({ type: 'error', message: 'Failed to archive recipe' });
          },
        });
        break;
    }
  }, [navigate, showToast, archiveRecipe, duplicateRecipe]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.minRating !== undefined) count++;
    if (filters.maxCookTime !== undefined) count++;
    if (filters.folderId) count++;
    return count;
  }, [filters]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and controls */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={handleQueryChange}
              placeholder="Search recipes, ingredients, tags..."
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
            aria-expanded={showFilters}
          >
            <FunnelIcon className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort control */}
          <SortControl value={sort} onChange={handleSortChange} />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onClear={() => setFilters({ query: filters.query })}
            />
          </div>
        )}
      </div>

      {/* Recipe library */}
      <div className="flex-1 overflow-auto p-4">
        <RecipeLibrary
          filters={filters}
          sort={sort}
          onRecipeSelect={handleRecipeSelect}
          onQuickAction={handleQuickAction}
        />
      </div>
    </div>
  );
}
