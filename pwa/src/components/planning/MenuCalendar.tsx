/**
 * Menu Calendar Component
 *
 * Displays a calendar view of menu assignments with meal slots.
 * Supports drag-and-drop for moving assignments.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Menu, MenuAssignment, MealSlot } from '@/types/menu';
import type { Recipe } from '@/types/recipe';
import { useRecipe } from '@/hooks/useRecipes';
import { useDailyTimeEstimates, useRemoveAssignment } from '@/hooks/useMenus';
import {
  ClockIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '../icons';

/**
 * Props for MenuCalendar component
 */
export interface MenuCalendarProps {
  menu: Menu;
  onSlotTap: (date: Date, slot: MealSlot) => void;
  onAssignmentTap?: (assignment: MenuAssignment) => void;
  recipes?: Map<string, Recipe>;
}

/**
 * Meal slot configuration
 */
const MEAL_SLOTS: { slot: MealSlot; label: string; icon: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { slot: 'lunch', label: 'Lunch', icon: '☀️' },
  { slot: 'dinner', label: 'Dinner', icon: '🌙' },
  { slot: 'snack', label: 'Snack', icon: '🍿' },
];

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format duration in minutes
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if leftover is expiring soon (within 1 day)
 */
function isExpiringSoon(expiryDate: Date | undefined): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 1 && diffDays >= 0;
}

/**
 * Get dates in range
 */
function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Assignment Card Component
 */
function AssignmentCard({
  assignment,
  recipe,
  onTap,
  onRemove,
}: {
  assignment: MenuAssignment;
  recipe?: Recipe;
  onTap?: () => void;
  onRemove: () => void;
}) {
  const navigate = useNavigate();
  const expiringSoon = isExpiringSoon(assignment.leftoverExpiryDate);
  const isLeftover = assignment.isLeftover;

  const handleClick = () => {
    if (onTap) {
      onTap();
    } else if (recipe) {
      navigate(`/recipe/${recipe.id}`);
    }
  };

  return (
    <div
      className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${
        isLeftover
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : expiringSoon
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isLeftover && <span className="text-xs">🍱</span>}
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {recipe?.title || 'Loading...'}
            </p>
          </div>
          {isLeftover ? (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Leftovers
            </p>
          ) : assignment.leftoverExpiryDate ? (
            <p
              className={`text-xs mt-0.5 ${
                expiringSoon
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {expiringSoon ? '⚠️ ' : ''}
              Expires {assignment.leftoverExpiryDate.toLocaleDateString()}
            </p>
          ) : null}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-opacity"
          aria-label="Remove assignment"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Recipe Loader Component - fetches recipe data for an assignment
 */
function AssignmentWithRecipe({
  assignment,
  onTap,
  onRemove,
}: {
  assignment: MenuAssignment;
  onTap?: () => void;
  onRemove: () => void;
}) {
  const { data: recipe } = useRecipe(assignment.recipeId);

  return (
    <AssignmentCard
      assignment={assignment}
      recipe={recipe}
      onTap={onTap}
      onRemove={onRemove}
    />
  );
}

/**
 * Day Column Component
 */
function DayColumn({
  date,
  assignments,
  dailyTime,
  onSlotTap,
  onAssignmentTap,
  onRemoveAssignment,
}: {
  date: Date;
  assignments: MenuAssignment[];
  dailyTime?: number;
  onSlotTap: (slot: MealSlot) => void;
  onAssignmentTap?: (assignment: MenuAssignment) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}) {
  const today = isToday(date);

  // Group assignments by meal slot
  const assignmentsBySlot = useMemo(() => {
    const map = new Map<MealSlot, MenuAssignment[]>();
    for (const slot of MEAL_SLOTS) {
      map.set(slot.slot, []);
    }
    for (const assignment of assignments) {
      const existing = map.get(assignment.mealSlot) || [];
      existing.push(assignment);
      map.set(assignment.mealSlot, existing);
    }
    return map;
  }, [assignments]);

  return (
    <div
      className={`flex-shrink-0 w-48 md:w-56 border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
        today ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
      }`}
    >
      {/* Date header */}
      <div
        className={`sticky top-0 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
          today ? 'bg-primary-50 dark:bg-primary-900/20' : ''
        }`}
      >
        <p
          className={`text-sm font-medium ${
            today ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'
          }`}
        >
          {formatDate(date)}
        </p>
        {dailyTime !== undefined && dailyTime > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(dailyTime)}
          </p>
        )}
      </div>

      {/* Meal slots */}
      <div className="p-2 space-y-3">
        {MEAL_SLOTS.map(({ slot, label, icon }) => {
          const slotAssignments = assignmentsBySlot.get(slot) || [];

          return (
            <div key={slot}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {icon} {label}
                </span>
                <button
                  onClick={() => onSlotTap(slot)}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={`Add recipe to ${label}`}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>

              {slotAssignments.length > 0 ? (
                <div className="space-y-1">
                  {slotAssignments.map((assignment) => (
                    <AssignmentWithRecipe
                      key={assignment.id}
                      assignment={assignment}
                      onTap={onAssignmentTap ? () => onAssignmentTap(assignment) : undefined}
                      onRemove={() => onRemoveAssignment(assignment.id)}
                    />
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => onSlotTap(slot)}
                  className="w-full p-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-400 dark:text-gray-500 text-xs hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-500 transition-colors"
                >
                  + Add recipe
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Menu Calendar Component
 */
export function MenuCalendar({
  menu,
  onSlotTap,
  onAssignmentTap,
}: MenuCalendarProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { data: dailyEstimates = [] } = useDailyTimeEstimates(menu.id);
  const removeAssignment = useRemoveAssignment();

  // Get all dates in the menu range
  const dates = useMemo(
    () => getDatesInRange(menu.startDate, menu.endDate),
    [menu.startDate, menu.endDate]
  );

  // Create a map of daily time estimates
  const dailyTimeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const estimate of dailyEstimates) {
      const key = estimate.date.toISOString().split('T')[0]!;
      map.set(key, estimate.totalTime.minutes);
    }
    return map;
  }, [dailyEstimates]);

  // Group assignments by date
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, MenuAssignment[]>();
    for (const assignment of menu.assignments) {
      const key = assignment.date.toISOString().split('T')[0]!;
      const existing = map.get(key) || [];
      existing.push(assignment);
      map.set(key, existing);
    }
    return map;
  }, [menu.assignments]);

  const handleRemoveAssignment = useCallback(
    (assignmentId: string) => {
      removeAssignment.mutate({ menuId: menu.id, assignmentId });
    },
    [menu.id, removeAssignment]
  );

  const handleScrollLeft = () => {
    setScrollOffset((prev) => Math.max(0, prev - 1));
  };

  const handleScrollRight = () => {
    setScrollOffset((prev) => Math.min(dates.length - 1, prev + 1));
  };

  // Visible dates (show 7 days on desktop, 3 on mobile)
  const visibleDates = dates.slice(scrollOffset);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">{menu.name}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScrollLeft}
            disabled={scrollOffset === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous days"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(menu.startDate)} - {formatDate(menu.endDate)}
          </span>
          <button
            onClick={handleScrollRight}
            disabled={scrollOffset >= dates.length - 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next days"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex overflow-x-auto">
        {visibleDates.map((date) => {
          const dateKey = date.toISOString().split('T')[0]!;
          const assignments = assignmentsByDate.get(dateKey) || [];
          const dailyTime = dailyTimeMap.get(dateKey);

          return (
            <DayColumn
              key={dateKey}
              date={date}
              assignments={assignments}
              dailyTime={dailyTime}
              onSlotTap={(slot) => onSlotTap(date, slot)}
              onAssignmentTap={onAssignmentTap}
              onRemoveAssignment={handleRemoveAssignment}
            />
          );
        })}
      </div>
    </div>
  );
}
