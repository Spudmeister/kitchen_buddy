/**
 * Shopping Item Component
 *
 * Displays a single shopping list item with check functionality.
 * Requirements: 19.1, 19.2, 19.6, 32.1
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ShoppingItem as ShoppingItemType } from '@/types/shopping';
import { CheckIcon, TrashIcon } from '@components/icons';

/**
 * Format quantity for display
 */
function formatQuantity(quantity: number, unit: string): string {
  // Round to reasonable precision
  const rounded = Math.round(quantity * 100) / 100;
  
  // Format based on value
  let quantityStr: string;
  if (rounded === Math.floor(rounded)) {
    quantityStr = rounded.toString();
  } else if (rounded * 4 === Math.floor(rounded * 4)) {
    // Convert to fractions for common values
    const whole = Math.floor(rounded);
    const frac = rounded - whole;
    const fractions: Record<number, string> = {
      0.25: '¼',
      0.5: '½',
      0.75: '¾',
      0.33: '⅓',
      0.67: '⅔',
    };
    const fracStr = fractions[Math.round(frac * 100) / 100] || frac.toFixed(2);
    quantityStr = whole > 0 ? `${whole} ${fracStr}` : fracStr;
  } else {
    quantityStr = rounded.toFixed(2);
  }

  // Skip unit for "piece" when quantity is 1
  if (unit === 'piece' && rounded === 1) {
    return '';
  }

  return `${quantityStr} ${unit}`;
}

/**
 * Format quantity for screen readers (more verbose)
 */
function formatQuantityForScreenReader(quantity: number, unit: string, name: string): string {
  const rounded = Math.round(quantity * 100) / 100;
  if (unit === 'piece' && rounded === 1) {
    return name;
  }
  return `${rounded} ${unit} of ${name}`;
}

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (checked: boolean) => void;
  onDelete?: () => void;
  isCustom?: boolean;
  recipeTitles?: Map<string, string>;
}

export function ShoppingItem({
  item,
  onToggle,
  onDelete,
  isCustom = false,
  recipeTitles,
}: ShoppingItemProps) {
  const navigate = useNavigate();

  const handleToggle = useCallback(() => {
    onToggle(!item.checked);
  }, [item.checked, onToggle]);

  const handleRecipeClick = useCallback(
    (recipeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/recipe/${recipeId}`);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const quantityStr = formatQuantity(item.quantity, item.unit);
  const screenReaderLabel = formatQuantityForScreenReader(item.quantity, item.unit, item.name);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        item.checked
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      role="listitem"
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
          item.checked
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
        }`}
        aria-label={item.checked ? `Mark ${screenReaderLabel} as not purchased` : `Mark ${screenReaderLabel} as purchased`}
        aria-pressed={item.checked}
        role="checkbox"
        aria-checked={item.checked}
      >
        {item.checked && <CheckIcon className="w-4 h-4" aria-hidden="true" />}
      </button>

      {/* Item content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          {/* Quantity and name */}
          <span
            className={`font-medium ${
              item.checked
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
            aria-hidden="true"
          >
            {quantityStr && (
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                {quantityStr}{' '}
              </span>
            )}
            {item.name}
          </span>
          {/* Screen reader only full description */}
          <span className="sr-only">{screenReaderLabel}</span>

          {/* Custom item badge */}
          {isCustom && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              aria-label="Custom item"
            >
              Custom
            </span>
          )}
        </div>

        {/* Recipe links - Requirements: 19.6 */}
        {item.recipeIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1" role="list" aria-label="Used in recipes">
            {item.recipeIds.map((recipeId) => (
              <button
                key={recipeId}
                onClick={(e) => handleRecipeClick(recipeId, e)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                role="listitem"
                aria-label={`View recipe: ${recipeTitles?.get(recipeId) || 'Recipe'}`}
              >
                {recipeTitles?.get(recipeId) || 'Recipe'}
              </button>
            ))}
          </div>
        )}

        {/* Cook-by date - Requirements: 18.5 */}
        {item.cookByDate && (
          <div 
            className="text-xs text-amber-600 dark:text-amber-400 mt-1"
            role="status"
            aria-label={`Cook by ${item.cookByDate.toLocaleDateString()}`}
          >
            <span aria-hidden="true">Cook by: {item.cookByDate.toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Delete button for custom items */}
      {isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
          aria-label={`Delete ${item.name} from shopping list`}
        >
          <TrashIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
