/**
 * Shopping Progress Component
 *
 * Displays shopping list progress indicator.
 * Requirements: 19.3, 19.4
 */

import { CheckCircleIcon } from '@components/icons';

interface ShoppingProgressProps {
  checked: number;
  total: number;
  percentage: number;
}

export function ShoppingProgress({ checked, total, percentage }: ShoppingProgressProps) {
  const isComplete = checked === total && total > 0;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-primary-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px] text-right">
          {checked} / {total}
        </span>
      </div>

      {/* Completion message - Requirements: 19.4 */}
      {isComplete && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300 font-medium">
            Shopping complete! 🎉
          </span>
        </div>
      )}
    </div>
  );
}
