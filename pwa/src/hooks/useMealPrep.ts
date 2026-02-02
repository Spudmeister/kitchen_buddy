/**
 * React hooks for meal prep functionality
 * 
 * Provides state management and mutations for meal prep mode.
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7
 */

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '../db/browser-database';
import { MealPrepService } from '../services/meal-prep-service';
import { StatisticsService } from '../services/statistics-service';
import type { MealPrepPlan } from '../types/meal-prep';
import type { CookSessionInput } from '../types/statistics';

/**
 * Get the meal prep service instance
 */
function getMealPrepService(): MealPrepService {
  const db = getDatabase();
  return new MealPrepService(db);
}

/**
 * Get the statistics service instance
 */
function getStatisticsService(): StatisticsService {
  const db = getDatabase();
  return new StatisticsService(db);
}

/**
 * Hook for managing meal prep state
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6
 */
export function useMealPrepState() {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [servingsPerRecipe, setServingsPerRecipe] = useState<Map<string, number>>(new Map());
  const [plan, setPlan] = useState<MealPrepPlan | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Add a recipe to the selection
  const addRecipe = useCallback((recipeId: string, defaultServings: number) => {
    setSelectedRecipeIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      return [...prev, recipeId];
    });
    setServingsPerRecipe((prev) => {
      const next = new Map(prev);
      if (!next.has(recipeId)) {
        next.set(recipeId, defaultServings);
      }
      return next;
    });
  }, []);

  // Remove a recipe from the selection
  const removeRecipe = useCallback((recipeId: string) => {
    setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    setServingsPerRecipe((prev) => {
      const next = new Map(prev);
      next.delete(recipeId);
      return next;
    });
  }, []);

  // Update servings for a recipe
  const updateServings = useCallback((recipeId: string, servings: number) => {
    setServingsPerRecipe((prev) => {
      const next = new Map(prev);
      next.set(recipeId, servings);
      return next;
    });
  }, []);

  // Generate the meal prep plan
  const generatePlan = useCallback(() => {
    if (selectedRecipeIds.length === 0) return null;

    const service = getMealPrepService();
    const newPlan = service.generateMealPrepPlan({
      recipeIds: selectedRecipeIds,
      servingsOverride: servingsPerRecipe,
    });
    setPlan(newPlan);
    setCompletedTaskIds(new Set());
    setIsComplete(false);
    return newPlan;
  }, [selectedRecipeIds, servingsPerRecipe]);

  // Toggle task completion
  const toggleTask = useCallback((taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Mark all tasks as complete
  const completeAllTasks = useCallback(() => {
    if (!plan) return;
    setCompletedTaskIds(new Set(plan.tasks.map((t) => t.id)));
    setIsComplete(true);
  }, [plan]);

  // Reset the meal prep state
  const reset = useCallback(() => {
    setSelectedRecipeIds([]);
    setServingsPerRecipe(new Map());
    setPlan(null);
    setCompletedTaskIds(new Set());
    setIsComplete(false);
  }, []);

  // Calculate progress
  const progress = useMemo(() => {
    if (!plan || plan.tasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = completedTaskIds.size;
    const total = plan.tasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  }, [plan, completedTaskIds]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    if (!plan) return { minutes: 0 };
    let minutes = 0;
    for (const task of plan.tasks) {
      if (!completedTaskIds.has(task.id)) {
        minutes += task.duration.minutes;
      }
    }
    return { minutes };
  }, [plan, completedTaskIds]);

  // Get tasks with completion status
  const tasksWithStatus = useMemo(() => {
    if (!plan) return [];
    return plan.tasks.map((task) => ({
      ...task,
      completed: completedTaskIds.has(task.id),
    }));
  }, [plan, completedTaskIds]);

  return {
    // State
    selectedRecipeIds,
    servingsPerRecipe,
    plan,
    completedTaskIds,
    isComplete,
    progress,
    remainingTime,
    tasksWithStatus,
    // Actions
    addRecipe,
    removeRecipe,
    updateServings,
    generatePlan,
    toggleTask,
    completeAllTasks,
    reset,
    setIsComplete,
  };
}

/**
 * Hook for logging multiple cook sessions after meal prep
 * Requirements: 24.7
 */
export function useLogMealPrepSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessions: CookSessionInput[]) => {
      const service = getStatisticsService();
      const results = [];
      for (const session of sessions) {
        const result = service.logCookSession(session);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      // Invalidate all cook session queries
      queryClient.invalidateQueries({ queryKey: ['cook-sessions'] });
      // Invalidate recipe queries to update last cooked info
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

/**
 * Hook to get recipes for meal prep
 */
export function useMealPrepRecipes(recipeIds: string[]) {
  const service = getMealPrepService();
  return useMemo(() => {
    if (recipeIds.length === 0) return [];
    return service.getRecipes(recipeIds);
  }, [recipeIds]);
}
