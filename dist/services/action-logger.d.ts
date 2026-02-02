/**
 * Action logging service for Sous Chef
 * Tracks the last 50 user actions for crash reproduction and replay
 */
import { ActionLogEntry, ActionResult } from '../types/logging.js';
/**
 * Action logger for tracking user actions for replay
 */
export declare class ActionLogger {
    private actionLog;
    private maxActions;
    private pendingActions;
    constructor(maxActions?: number);
    /**
     * Start tracking an action (call before the action executes)
     * Returns an action ID to use when completing the action
     */
    startAction(action: string, payload?: unknown): string;
    /**
     * Complete a tracked action (call after the action finishes)
     */
    completeAction(actionId: string, result: ActionResult): void;
    /**
     * Log an action directly (for simple actions that don't need timing)
     */
    logAction(action: string, payload: unknown, result: ActionResult, duration?: number): void;
    /**
     * Log a successful action
     */
    logSuccess(action: string, payload?: unknown, duration?: number): void;
    /**
     * Log a failed action
     */
    logError(action: string, payload?: unknown, duration?: number): void;
    /**
     * Sanitize payload to remove sensitive data and circular references
     */
    private sanitizePayload;
    /**
     * Get the action log
     */
    getActionLog(): ActionLogEntry[];
    /**
     * Get recent actions
     */
    getRecentActions(limit?: number): ActionLogEntry[];
    /**
     * Get failed actions only
     */
    getFailedActions(): ActionLogEntry[];
    /**
     * Get actions by type
     */
    getActionsByType(action: string): ActionLogEntry[];
    /**
     * Get actions within a time range
     */
    getActionsInRange(start: Date, end: Date): ActionLogEntry[];
    /**
     * Clear the action log
     */
    clearLog(): void;
    /**
     * Get the number of logged actions
     */
    getLogSize(): number;
    /**
     * Get the maximum log size
     */
    getMaxSize(): number;
    /**
     * Set the maximum log size
     */
    setMaxSize(maxActions: number): void;
    /**
     * Get pending actions (actions that started but haven't completed)
     */
    getPendingActions(): Array<{
        actionId: string;
        action: string;
        startTime: number;
    }>;
    /**
     * Cancel a pending action (remove without logging)
     */
    cancelPendingAction(actionId: string): boolean;
}
/**
 * Get the global action logger instance
 */
export declare function getActionLogger(): ActionLogger;
/**
 * Initialize the global action logger with custom max size
 */
export declare function initializeActionLogger(maxActions: number): ActionLogger;
/**
 * Reset the global action logger (useful for testing)
 */
export declare function resetActionLogger(): void;
/**
 * Helper function to wrap an async function with action logging
 */
export declare function withActionLogging<T>(actionLogger: ActionLogger, action: string, payload: unknown, fn: () => Promise<T>): Promise<T>;
/**
 * Helper function to wrap a sync function with action logging
 */
export declare function withActionLoggingSync<T>(actionLogger: ActionLogger, action: string, payload: unknown, fn: () => T): T;
//# sourceMappingURL=action-logger.d.ts.map