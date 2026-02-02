/**
 * React Query hooks for menu data
 *
 * Provides data fetching, caching, and mutations for menus.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { MenuService } from '@services/menu-service';
import type { MenuInput, MenuUpdate, MenuAssignmentInput, MealSlot, AvailableLeftover } from '@/types/menu';

/**
 * Get the menu service instance
 */
function getMenuService(): MenuService {
  const db = getDatabase();
  return new MenuService(db);
}

/**
 * Query keys for menus
 */
export const menuKeys = {
  all: ['menus'] as const,
  lists: () => [...menuKeys.all, 'list'] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
  current: () => [...menuKeys.all, 'current'] as const,
  timeEstimate: (id: string) => [...menuKeys.all, 'time-estimate', id] as const,
  dailyEstimates: (id: string) => [...menuKeys.all, 'daily-estimates', id] as const,
  availableLeftovers: (id: string, date: string) => [...menuKeys.all, 'available-leftovers', id, date] as const,
  expiringLeftovers: (id: string) => [...menuKeys.all, 'expiring-leftovers', id] as const,
};

/**
 * Hook to fetch all menus
 */
export function useMenus() {
  return useQuery({
    queryKey: menuKeys.lists(),
    queryFn: () => {
      const service = getMenuService();
      return Promise.resolve(service.getAllMenus());
    },
  });
}

/**
 * Hook to fetch a single menu
 */
export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: menuKeys.detail(id ?? ''),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined);
      const service = getMenuService();
      return Promise.resolve(service.getMenu(id));
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch the current or upcoming menu
 */
export function useCurrentMenu() {
  return useQuery({
    queryKey: menuKeys.current(),
    queryFn: () => {
      const service = getMenuService();
      return Promise.resolve(service.getCurrentMenu());
    },
  });
}

/**
 * Hook to get menu time estimate
 */
export function useMenuTimeEstimate(menuId: string | undefined) {
  return useQuery({
    queryKey: menuKeys.timeEstimate(menuId ?? ''),
    queryFn: () => {
      if (!menuId) return Promise.resolve(undefined);
      const service = getMenuService();
      return Promise.resolve(service.getMenuTimeEstimate(menuId));
    },
    enabled: !!menuId,
  });
}

/**
 * Hook to get daily time estimates for a menu
 */
export function useDailyTimeEstimates(menuId: string | undefined) {
  return useQuery({
    queryKey: menuKeys.dailyEstimates(menuId ?? ''),
    queryFn: () => {
      if (!menuId) return Promise.resolve([]);
      const service = getMenuService();
      return Promise.resolve(service.getDailyTimeEstimates(menuId));
    },
    enabled: !!menuId,
  });
}

/**
 * Hook to create a menu
 */
export function useCreateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MenuInput) => {
      const service = getMenuService();
      return Promise.resolve(service.createMenu(input));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
    },
  });
}

/**
 * Hook to update a menu
 */
export function useUpdateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: MenuUpdate }) => {
      const service = getMenuService();
      return Promise.resolve(service.updateMenu(id, updates));
    },
    onSuccess: (menu) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menu.id) });
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
    },
  });
}

/**
 * Hook to delete a menu
 */
export function useDeleteMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const service = getMenuService();
      service.deleteMenu(id);
      return Promise.resolve(id);
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
    },
  });
}

/**
 * Hook to assign a recipe to a menu
 */
export function useAssignRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ menuId, input }: { menuId: string; input: MenuAssignmentInput }) => {
      const service = getMenuService();
      return Promise.resolve(service.assignRecipe(menuId, input));
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
      queryClient.invalidateQueries({ queryKey: menuKeys.timeEstimate(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.dailyEstimates(assignment.menuId) });
    },
  });
}

/**
 * Hook to remove an assignment from a menu
 */
export function useRemoveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ menuId, assignmentId }: { menuId: string; assignmentId: string }) => {
      const service = getMenuService();
      service.removeAssignment(menuId, assignmentId);
      return Promise.resolve({ menuId, assignmentId });
    },
    onSuccess: ({ menuId }) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
      queryClient.invalidateQueries({ queryKey: menuKeys.timeEstimate(menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.dailyEstimates(menuId) });
    },
  });
}

/**
 * Hook to move an assignment to a different date/slot
 */
export function useMoveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuId,
      assignmentId,
      newDate,
      newMealSlot,
      newCookDate,
    }: {
      menuId: string;
      assignmentId: string;
      newDate: Date;
      newMealSlot?: MealSlot;
      newCookDate?: Date;
    }) => {
      const service = getMenuService();
      return Promise.resolve(service.moveAssignment(menuId, assignmentId, newDate, newMealSlot, newCookDate));
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
      queryClient.invalidateQueries({ queryKey: menuKeys.dailyEstimates(assignment.menuId) });
    },
  });
}

/**
 * Hook to get available leftovers for a specific date
 * Requirements: 17.3 - Suggest available leftovers when planning
 */
export function useAvailableLeftovers(menuId: string | undefined, targetDate: Date | undefined) {
  const dateStr = targetDate ? targetDate.toISOString().split('T')[0]! : '';
  
  return useQuery({
    queryKey: menuKeys.availableLeftovers(menuId ?? '', dateStr),
    queryFn: (): Promise<AvailableLeftover[]> => {
      if (!menuId || !targetDate) return Promise.resolve([]);
      const service = getMenuService();
      return Promise.resolve(service.getAvailableLeftovers(menuId, targetDate));
    },
    enabled: !!menuId && !!targetDate,
  });
}

/**
 * Hook to get expiring leftovers
 * Requirements: 17.2 - Highlight recipes with expiring leftovers
 */
export function useExpiringLeftovers(menuId: string | undefined, withinDays: number = 1) {
  return useQuery({
    queryKey: menuKeys.expiringLeftovers(menuId ?? ''),
    queryFn: (): Promise<AvailableLeftover[]> => {
      if (!menuId) return Promise.resolve([]);
      const service = getMenuService();
      return Promise.resolve(service.getExpiringLeftovers(menuId, withinDays));
    },
    enabled: !!menuId,
  });
}

/**
 * Hook to assign a leftover meal
 * Requirements: 17.4 - Allow marking meal as "leftovers from [recipe]"
 */
export function useAssignLeftover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuId,
      sourceAssignmentId,
      date,
      mealSlot,
      servings,
    }: {
      menuId: string;
      sourceAssignmentId: string;
      date: Date;
      mealSlot: MealSlot;
      servings?: number;
    }) => {
      const service = getMenuService();
      return Promise.resolve(service.assignLeftover(menuId, sourceAssignmentId, date, mealSlot, servings));
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
      queryClient.invalidateQueries({ queryKey: menuKeys.timeEstimate(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.dailyEstimates(assignment.menuId) });
      // Invalidate leftover queries
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}

/**
 * Hook to mark an existing assignment as a leftover
 * Requirements: 17.4 - Allow marking meal as "leftovers from [recipe]"
 */
export function useMarkAsLeftover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuId,
      assignmentId,
      sourceAssignmentId,
    }: {
      menuId: string;
      assignmentId: string;
      sourceAssignmentId: string;
    }) => {
      const service = getMenuService();
      return Promise.resolve(service.markAsLeftover(menuId, assignmentId, sourceAssignmentId));
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(assignment.menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.current() });
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}
