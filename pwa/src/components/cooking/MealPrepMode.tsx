/**
 * Meal Prep Mode Component
 *
 * Displays consolidated prep tasks for multiple recipes.
 * Groups tasks by shared ingredients and shows which recipes each task serves.
 *
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6
 */

import { useMemo } from 'react';
import {
  CheckIcon,
  ClockIcon,
  ChefHatIcon,
  UsersIcon,
} from '../icons';
import type { PrepTask, MealPrepPlan } from '../../types/meal-prep';
import type { Recipe } from '../../types/recipe';

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
 * Props for MealPrepMode component
 */
export interface MealPrepModeProps {
  /** The meal prep plan */
  plan: MealPrepPlan;
  /** Recipes in the plan */
  recipes: Recipe[];
  /** Tasks with completion status */
  tasks: (PrepTask & { completed: boolean })[];
  /** Progress information */
  progress: { completed: number; total: number; percentage: number };
  /** Remaining time */
  remainingTime: { minutes: number };
  /** Callback when a task is toggled */
  onToggleTask: (taskId: string) => void;
  /** Callback when all tasks are completed */
  onComplete: () => void;
}

/**
 * Task item component
 */
function TaskItem({
  task,
  recipes,
  onToggle,
}: {
  task: PrepTask & { completed: boolean };
  recipes: Recipe[];
  onToggle: () => void;
}) {
  // Get recipe names for this task
  const recipeNames = useMemo(() => {
    return task.recipeIds
      .map((id) => recipes.find((r) => r.id === id)?.title ?? 'Unknown')
      .join(', ');
  }, [task.recipeIds, recipes]);

  const isShared = task.recipeIds.length > 1;
  const isIngredientPrep = task.taskType === 'ingredient_prep';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
        task.completed
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
        }`}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && <CheckIcon className="w-4 h-4" />}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            task.completed
              ? 'text-gray-500 dark:text-gray-400 line-through'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {task.description}
        </p>

        {/* Task metadata */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {/* Duration */}
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(task.duration.minutes)}
          </span>

          {/* Shared indicator */}
          {isShared && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <UsersIcon className="w-3 h-3" />
              Shared ({task.recipeIds.length} recipes)
            </span>
          )}

          {/* Task type badge */}
          {isIngredientPrep && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              Prep
            </span>
          )}
          {task.taskType === 'cooking' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              Cook
            </span>
          )}
        </div>

        {/* Recipe names */}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
          For: {recipeNames}
        </p>
      </div>
    </div>
  );
}

/**
 * Progress header component
 */
function ProgressHeader({
  progress,
  remainingTime,
  totalTime,
}: {
  progress: { completed: number; total: number; percentage: number };
  remainingTime: { minutes: number };
  totalTime: { minutes: number };
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Progress
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {progress.completed} of {progress.total} tasks
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Time info */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          {formatDuration(remainingTime.minutes)} remaining
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          Total: {formatDuration(totalTime.minutes)}
        </span>
      </div>
    </div>
  );
}

/**
 * Shared ingredients summary
 */
function SharedIngredientsSummary({
  plan,
}: {
  plan: MealPrepPlan;
}) {
  if (plan.sharedIngredients.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
        Shared Ingredients ({plan.sharedIngredients.length})
      </h3>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
        These ingredients are used in multiple recipes - prep them together to save time!
      </p>
      <div className="flex flex-wrap gap-2">
        {plan.sharedIngredients.map((ingredient) => (
          <span
            key={ingredient.name}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
          >
            {ingredient.name} ({ingredient.totalQuantity.toFixed(1)} {ingredient.unit})
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Meal Prep Mode Component
 */
export function MealPrepMode({
  plan,
  recipes,
  tasks,
  progress,
  remainingTime,
  onToggleTask,
  onComplete,
}: MealPrepModeProps) {
  // Group tasks by type
  const { prepTasks, cookingTasks } = useMemo(() => {
    const prep: (PrepTask & { completed: boolean })[] = [];
    const cooking: (PrepTask & { completed: boolean })[] = [];

    for (const task of tasks) {
      if (task.taskType === 'ingredient_prep') {
        prep.push(task);
      } else {
        cooking.push(task);
      }
    }

    return { prepTasks: prep, cookingTasks: cooking };
  }, [tasks]);

  const allComplete = progress.completed === progress.total && progress.total > 0;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <ProgressHeader
        progress={progress}
        remainingTime={remainingTime}
        totalTime={plan.totalTime}
      />

      {/* Shared ingredients summary */}
      <SharedIngredientsSummary plan={plan} />

      {/* Prep tasks section */}
      {prepTasks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHatIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
            Prep Tasks ({prepTasks.filter((t) => t.completed).length}/{prepTasks.length})
          </h2>
          <div className="space-y-2">
            {prepTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                recipes={recipes}
                onToggle={() => onToggleTask(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cooking tasks section */}
      {cookingTasks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ClockIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </span>
            Cooking Steps ({cookingTasks.filter((t) => t.completed).length}/{cookingTasks.length})
          </h2>
          <div className="space-y-2">
            {cookingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                recipes={recipes}
                onToggle={() => onToggleTask(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Complete button */}
      {allComplete && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-900 to-transparent">
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg"
          >
            <CheckIcon className="w-5 h-5" />
            Complete Meal Prep
          </button>
        </div>
      )}
    </div>
  );
}

export default MealPrepMode;
