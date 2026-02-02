/**
 * Recipe Heritage Component
 *
 * Displays recipe lineage for duplicated recipes:
 * - Link to parent recipe (if duplicated from another)
 * - Links to child recipes (if others duplicated from this)
 * - Full ancestor chain on request
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recipe, RecipeHeritage as RecipeHeritageType } from '../../types/recipe';
import {
  LinkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DocumentDuplicateIcon,
} from '../icons';

/**
 * Props for RecipeHeritage component
 */
export interface RecipeHeritageProps {
  /** Heritage information for the recipe */
  heritage: RecipeHeritageType;
  /** Callback when a recipe link is clicked */
  onRecipeClick?: (recipeId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact recipe link component
 */
interface RecipeLinkProps {
  recipe: Recipe;
  label?: string;
  direction?: 'parent' | 'child';
  onClick: () => void;
}

function RecipeLink({ recipe, label, direction = 'child', onClick }: RecipeLinkProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      aria-label={`Go to ${recipe.title}`}
    >
      {direction === 'parent' && (
        <ChevronLeftIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">
            {label}
          </span>
        )}
        <span className="font-medium text-gray-900 dark:text-white truncate block">
          {recipe.title}
        </span>
      </div>
      {direction === 'child' && (
        <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </button>
  );
}

/**
 * Ancestor chain component - shows full lineage
 */
interface AncestorChainProps {
  ancestors: Recipe[];
  onRecipeClick: (recipeId: string) => void;
}

function AncestorChain({ ancestors, onRecipeClick }: AncestorChainProps) {
  if (ancestors.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Full Lineage
      </h4>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {ancestors.map((ancestor, index) => (
          <span key={ancestor.id} className="flex items-center">
            <button
              onClick={() => onRecipeClick(ancestor.id)}
              className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[150px]"
              title={ancestor.title}
            >
              {ancestor.title}
            </button>
            {index < ancestors.length - 1 && (
              <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
            )}
          </span>
        ))}
        <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
        <span className="font-medium text-gray-900 dark:text-white">Current</span>
      </div>
    </div>
  );
}

/**
 * Recipe Heritage Component
 */
export function RecipeHeritage({
  heritage,
  onRecipeClick,
  className = '',
}: RecipeHeritageProps) {
  const navigate = useNavigate();
  const [showFullLineage, setShowFullLineage] = useState(false);

  const { parent, ancestors, children } = heritage;
  const hasHeritage = parent || children.length > 0;

  const handleRecipeClick = useCallback((recipeId: string) => {
    if (onRecipeClick) {
      onRecipeClick(recipeId);
    } else {
      navigate(`/recipe/${recipeId}`);
    }
  }, [onRecipeClick, navigate]);

  const toggleFullLineage = useCallback(() => {
    setShowFullLineage((prev) => !prev);
  }, []);

  // Don't render anything if there's no heritage
  if (!hasHeritage) {
    return null;
  }

  return (
    <section
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      aria-labelledby="heritage-heading"
    >
      <div className="p-4">
        <h3
          id="heritage-heading"
          className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"
        >
          <LinkIcon className="w-5 h-5" />
          Recipe Heritage
        </h3>

        <div className="space-y-4">
          {/* Parent recipe */}
          {parent && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Duplicated From
              </h4>
              <RecipeLink
                recipe={parent}
                direction="parent"
                onClick={() => handleRecipeClick(parent.id)}
              />
              
              {/* Show full lineage toggle if there are more ancestors */}
              {ancestors.length > 1 && (
                <button
                  onClick={toggleFullLineage}
                  className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {showFullLineage ? 'Hide full lineage' : `Show full lineage (${ancestors.length} ancestors)`}
                </button>
              )}
              
              {/* Full ancestor chain */}
              {showFullLineage && ancestors.length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <AncestorChain
                    ancestors={ancestors}
                    onRecipeClick={handleRecipeClick}
                  />
                </div>
              )}
            </div>
          )}

          {/* Child recipes (derived from this one) */}
          {children.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Derived Recipes ({children.length})
              </h4>
              <div className="space-y-2">
                {children.map((child) => (
                  <RecipeLink
                    key={child.id}
                    recipe={child}
                    direction="child"
                    onClick={() => handleRecipeClick(child.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <DocumentDuplicateIcon className="w-4 h-4" />
          Duplicated recipes maintain links to their origins
        </p>
      </div>
    </section>
  );
}
