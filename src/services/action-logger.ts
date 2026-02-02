/**
 * Action logging service for Sous Chef
 * Tracks the last 50 user actions for crash reproduction and replay
 */

import { ActionLogEntry, ActionResult } from '../types/logging.js';

/**
 * Default maximum number of actions to keep in the log
 */
const DEFAULT_MAX_ACTIONS = 50;

/**
 * Action logger for tracking user actions for replay
 */
export class ActionLogger {
  private actionLog: ActionLogEntry[] = [];
  private maxActions: number;
  private pendingActions: Map<string, { action: string; payload: unknown; startTime: number }> = new Map();

  constructor(maxActions: number = DEFAULT_MAX_ACTIONS) {
    this.maxActions = maxActions;
  }

  /**
   * Start tracking an action (call before the action executes)
   * Returns an action ID to use when completing the action
   */
  startAction(action: string, payload?: unknown): string {
    const actionId = `${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.pendingActions.set(actionId, {
      action,
      payload,
      startTime: performance.now(),
    });
    return actionId;
  }

  /**
   * Complete a tracked action (call after the action finishes)
   */
  completeAction(actionId: string, result: ActionResult): void {
    const pending = this.pendingActions.get(actionId);
    if (!pending) {
      return;
    }

    const duration = performance.now() - pending.startTime;
    this.pendingActions.delete(actionId);

    this.logAction(pending.action, pending.payload, result, duration);
  }

  /**
   * Log an action directly (for simple actions that don't need timing)
   */
  logAction(
    action: string,
    payload: unknown,
    result: ActionResult,
    duration: number = 0
  ): void {
    const entry: ActionLogEntry = {
      timestamp: new Date(),
      action,
      payload: this.sanitizePayload(payload),
      result,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
    };

    this.actionLog.push(entry);

    // Trim to max size
    if (this.actionLog.length > this.maxActions) {
      this.actionLog.shift();
    }
  }

  /**
   * Log a successful action
   */
  logSuccess(action: string, payload?: unknown, duration: number = 0): void {
    this.logAction(action, payload, 'success', duration);
  }

  /**
   * Log a failed action
   */
  logError(action: string, payload?: unknown, duration: number = 0): void {
    this.logAction(action, payload, 'error', duration);
  }

  /**
   * Sanitize payload to remove sensitive data and circular references
   */
  private sanitizePayload(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return payload;
    }

    try {
      // Attempt to serialize and deserialize to remove circular references
      // and non-serializable values
      const serialized = JSON.stringify(payload, (key, value) => {
        // Skip sensitive keys
        const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'key'];
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          return '[REDACTED]';
        }
        // Skip functions
        if (typeof value === 'function') {
          return '[Function]';
        }
        // Handle Dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      return JSON.parse(serialized);
    } catch {
      // If serialization fails, return a placeholder
      return '[Non-serializable]';
    }
  }

  /**
   * Get the action log
   */
  getActionLog(): ActionLogEntry[] {
    return [...this.actionLog];
  }

  /**
   * Get recent actions
   */
  getRecentActions(limit?: number): ActionLogEntry[] {
    if (limit && limit > 0) {
      return this.actionLog.slice(-limit);
    }
    return [...this.actionLog];
  }

  /**
   * Get failed actions only
   */
  getFailedActions(): ActionLogEntry[] {
    return this.actionLog.filter(entry => entry.result === 'error');
  }

  /**
   * Get actions by type
   */
  getActionsByType(action: string): ActionLogEntry[] {
    return this.actionLog.filter(entry => entry.action === action);
  }

  /**
   * Get actions within a time range
   */
  getActionsInRange(start: Date, end: Date): ActionLogEntry[] {
    return this.actionLog.filter(
      entry => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  /**
   * Clear the action log
   */
  clearLog(): void {
    this.actionLog = [];
    this.pendingActions.clear();
  }

  /**
   * Get the number of logged actions
   */
  getLogSize(): number {
    return this.actionLog.length;
  }

  /**
   * Get the maximum log size
   */
  getMaxSize(): number {
    return this.maxActions;
  }

  /**
   * Set the maximum log size
   */
  setMaxSize(maxActions: number): void {
    this.maxActions = maxActions;
    // Trim if necessary
    while (this.actionLog.length > this.maxActions) {
      this.actionLog.shift();
    }
  }

  /**
   * Get pending actions (actions that started but haven't completed)
   */
  getPendingActions(): Array<{ actionId: string; action: string; startTime: number }> {
    const result: Array<{ actionId: string; action: string; startTime: number }> = [];
    this.pendingActions.forEach((value, key) => {
      result.push({
        actionId: key,
        action: value.action,
        startTime: value.startTime,
      });
    });
    return result;
  }

  /**
   * Cancel a pending action (remove without logging)
   */
  cancelPendingAction(actionId: string): boolean {
    return this.pendingActions.delete(actionId);
  }
}

// Singleton instance for global action logging
let globalActionLogger: ActionLogger | null = null;

/**
 * Get the global action logger instance
 */
export function getActionLogger(): ActionLogger {
  if (!globalActionLogger) {
    globalActionLogger = new ActionLogger();
  }
  return globalActionLogger;
}

/**
 * Initialize the global action logger with custom max size
 */
export function initializeActionLogger(maxActions: number): ActionLogger {
  globalActionLogger = new ActionLogger(maxActions);
  return globalActionLogger;
}

/**
 * Reset the global action logger (useful for testing)
 */
export function resetActionLogger(): void {
  globalActionLogger = null;
}

/**
 * Helper function to wrap an async function with action logging
 */
export async function withActionLogging<T>(
  actionLogger: ActionLogger,
  action: string,
  payload: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const actionId = actionLogger.startAction(action, payload);
  try {
    const result = await fn();
    actionLogger.completeAction(actionId, 'success');
    return result;
  } catch (error) {
    actionLogger.completeAction(actionId, 'error');
    throw error;
  }
}

/**
 * Helper function to wrap a sync function with action logging
 */
export function withActionLoggingSync<T>(
  actionLogger: ActionLogger,
  action: string,
  payload: unknown,
  fn: () => T
): T {
  const actionId = actionLogger.startAction(action, payload);
  try {
    const result = fn();
    actionLogger.completeAction(actionId, 'success');
    return result;
  } catch (error) {
    actionLogger.completeAction(actionId, 'error');
    throw error;
  }
}
