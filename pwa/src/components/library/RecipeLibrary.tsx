/**
 * Recipe Library Component
 *
 * Displays recipes in a responsive virtualized grid with infinite scroll.
 * Supports filtering and sorting.
 *
 * Requirements: 3.1, 3.5, 3.6, 33.6
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecipeCard, type QuickActionType } from '../recipe/RecipeCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useInfiniteRecipes } from '../../hooks/useRecipes';
import type { Recipe } from '../../types/recipe';
import type { RecipeFilters, RecipeSort } from '../../types/search';
import { PlusIcon, BookOpenIcon } from '../icons';

/**
 * Props for RecipeLibrary component
 */
export interface RecipeLibraryProps {
  filters?: RecipeFilters;
  sort?: RecipeSort;
  onRecipeSelect?: (recipe: Recipe) => void;
  onQuickAction?: (recipe: Recipe, action: QuickActionType) => void;
  className?: string;
  /** Enable virtualization for large lists (default: true) */
  virtualized?: boolean;
}

/**
 * Empty state component when no recipes exist
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const navigate = useNavigate();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <BookOpenIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No recipes found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Try adjusting your filters or search terms to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-4">
        <BookOpenIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Start your recipe collection
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        Add your first recipe to get started. You can import from a URL, take a photo, or enter it manually.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/recipe/import')}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Import Recipe
        </button>
        <button
          onClick={() => navigate('/recipe/new')}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Add Manually
        </button>
      </div>
    </div>
  );
}

/**
 * Calculate number of columns based on container width
 */
function useResponsiveColumns(containerRef: React.RefObject<HTMLDivElement>) {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      const width = container.clientWidth;
      // Match Tailwind breakpoints: sm:2, lg:3, xl:4
      if (width >= 1280) setColumns(4);
      else if (width >= 1024) setColumns(3);
      else if (width >= 640) setColumns(2);
      else setColumns(1);
    };

    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(container);
    updateColumns();

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return columns;
}

/**
 * Recipe Library Component
 */
export function RecipeLibrary({
  filters,
  sort,
  onRecipeSelect,
  onQuickAction,
  className = '',
  virtualized = true,
}: RecipeLibraryProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const columns = useResponsiveColumns(containerRef);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteRecipes(filters, sort);

  // Flatten all pages into a single array
  const recipes = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items);
  }, [data?.pages]);

  const totalCount = data?.pages[0]?.total ?? 0;

  // Check if any filters are active
  const hasFilters = useMemo(() => {
    if (!filters) return false;
    return !!(
      filters.query?.trim() ||
      (filters.tags && filters.tags.length > 0) ||
      filters.minRating !== undefined ||
      filters.maxCookTime !== undefined ||
      filters.folderId
    );
  }, [filters]);

  // Set up intersection observer for infinite scroll (non-virtualized mode)
  useEffect(() => {
    if (virtualized) return; // Skip for virtualized mode

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, virtualized]);

  const handleRecipeClick = useCallback(
    (recipe: Recipe) => {
      if (onRecipeSelect) {
        onRecipeSelect(recipe);
      } else {
        navigate(`/recipe/${recipe.id}`);
      }
    },
    [onRecipeSelect, navigate]
  );

  const handleQuickAction = useCallback(
    (recipe: Recipe, action: QuickActionType) => {
      if (onQuickAction) {
        onQuickAction(recipe, action);
      }
    },
    [onQuickAction]
  );

  // Handle end reached for virtualized mode
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-red-600 dark:text-red-400 mb-2">
          Failed to load recipes
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (recipes.length === 0) {
    return <EmptyState hasFilters={hasFilters} />;
  }

  // Virtualized rendering for large lists
  if (virtualized && recipes.length > 20) {
    const ROW_HEIGHT = 280; // Approximate height of a recipe card
    const GAP = 16;
    const rowCount = Math.ceil(recipes.length / columns);

    return (
      <div className={className} ref={containerRef}>
        {/* Recipe count */}
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}
        </div>

        {/* Virtualized grid */}
        <VirtualizedRecipeGrid
          recipes={recipes}
          columns={columns}
          rowHeight={ROW_HEIGHT}
          gap={GAP}
          onRecipeClick={handleRecipeClick}
          onQuickAction={handleQuickAction}
          onEndReached={handleEndReached}
          isLoading={isFetchingNextPage}
          hasMore={hasNextPage}
        />
      </div>
    );
  }

  // Standard rendering for smaller lists
  return (
    <div className={className} ref={containerRef}>
      {/* Recipe count */}
      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}
      </div>

      {/* Recipe grid */}
      <div
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Recipe list"
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            variant="standard"
            showQuickActions
            onTap={() => handleRecipeClick(recipe)}
            onQuickAction={(action) => handleQuickAction(recipe, action)}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-10 mt-4">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* End of list indicator */}
      {!hasNextPage && recipes.length > 0 && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">
          You've reached the end
        </p>
      )}
    </div>
  );
}

/**
 * Virtualized Recipe Grid Component
 * 
 * Renders only visible rows for performance with large recipe lists.
 */
interface VirtualizedRecipeGridProps {
  recipes: Recipe[];
  columns: number;
  rowHeight: number;
  gap: number;
  onRecipeClick: (recipe: Recipe) => void;
  onQuickAction: (recipe: Recipe, action: QuickActionType) => void;
  onEndReached: () => void;
  isLoading: boolean;
  hasMore?: boolean;
}

function VirtualizedRecipeGrid({
  recipes,
  columns,
  rowHeight,
  gap,
  onRecipeClick,
  onQuickAction,
  onEndReached,
  isLoading,
  hasMore,
}: VirtualizedRecipeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const hasCalledEndReached = useRef(false);

  const rowCount = Math.ceil(recipes.length / columns);
  const totalHeight = rowCount * (rowHeight + gap) - (rowCount > 0 ? gap : 0);

  // Calculate visible rows with overscan
  const overscan = 2;
  const effectiveRowHeight = rowHeight + gap;
  const startRow = Math.max(0, Math.floor(scrollTop / effectiveRowHeight) - overscan);
  const visibleRows = Math.ceil(containerHeight / effectiveRowHeight);
  const endRow = Math.min(rowCount, startRow + visibleRows + overscan * 2);

  // Get visible items
  const visibleItems = useMemo(() => {
    const items: Array<{ recipe: Recipe; index: number; row: number; col: number }> = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index < recipes.length) {
          items.push({ recipe: recipes[index], index, row, col });
        }
      }
    }
    return items;
  }, [startRow, endRow, columns, recipes]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    // Check if we should trigger onEndReached
    if (!isLoading && hasMore) {
      const scrollPercentage =
        (container.scrollTop + container.clientHeight) / container.scrollHeight;
      if (scrollPercentage >= 0.8 && !hasCalledEndReached.current) {
        hasCalledEndReached.current = true;
        onEndReached();
      } else if (scrollPercentage < 0.8) {
        hasCalledEndReached.current = false;
      }
    }
  }, [isLoading, hasMore, onEndReached]);

  // Set up resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Reset end reached flag when recipes change
  useEffect(() => {
    hasCalledEndReached.current = false;
  }, [recipes.length]);

  return (
    <div
      ref={containerRef}
      className="overflow-auto h-[calc(100vh-200px)] min-h-[400px]"
      onScroll={handleScroll}
      role="grid"
      aria-label="Recipe grid"
      aria-rowcount={rowCount}
      aria-colcount={columns}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleItems.map(({ recipe, index, row, col }) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            top: row * effectiveRowHeight,
            left: `calc(${(col / columns) * 100}% + ${col > 0 ? gap / 2 : 0}px)`,
            width: `calc(${100 / columns}% - ${gap * (columns - 1) / columns}px)`,
            height: rowHeight,
          };

          return (
            <div
              key={recipe.id}
              style={style}
              role="gridcell"
              aria-rowindex={row + 1}
              aria-colindex={col + 1}
            >
              <RecipeCard
                recipe={recipe}
                variant="standard"
                showQuickActions
                onTap={() => onRecipeClick(recipe)}
                onQuickAction={(action) => onQuickAction(recipe, action)}
                className="h-full"
              />
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="py-4 flex justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && recipes.length > 0 && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
          You've reached the end
        </p>
      )}
    </div>
  );
}
