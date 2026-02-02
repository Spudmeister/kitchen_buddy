/**
 * Action logging service for Sous Chef
 * Tracks the last 50 user actions for crash reproduction and replay
 */
/**
 * Default maximum number of actions to keep in the log
 */
const DEFAULT_MAX_ACTIONS = 50;
/**
 * Action logger for tracking user actions for replay
 */
export class ActionLogger {
    actionLog = [];
    maxActions;
    pendingActions = new Map();
    constructor(maxActions = DEFAULT_MAX_ACTIONS) {
        this.maxActions = maxActions;
    }
    /**
     * Start tracking an action (call before the action executes)
     * Returns an action ID to use when completing the action
     */
    startAction(action, payload) {
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
    completeAction(actionId, result) {
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
    logAction(action, payload, result, duration = 0) {
        const entry = {
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
    logSuccess(action, payload, duration = 0) {
        this.logAction(action, payload, 'success', duration);
    }
    /**
     * Log a failed action
     */
    logError(action, payload, duration = 0) {
        this.logAction(action, payload, 'error', duration);
    }
    /**
     * Sanitize payload to remove sensitive data and circular references
     */
    sanitizePayload(payload) {
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
        }
        catch {
            // If serialization fails, return a placeholder
            return '[Non-serializable]';
        }
    }
    /**
     * Get the action log
     */
    getActionLog() {
        return [...this.actionLog];
    }
    /**
     * Get recent actions
     */
    getRecentActions(limit) {
        if (limit && limit > 0) {
            return this.actionLog.slice(-limit);
        }
        return [...this.actionLog];
    }
    /**
     * Get failed actions only
     */
    getFailedActions() {
        return this.actionLog.filter(entry => entry.result === 'error');
    }
    /**
     * Get actions by type
     */
    getActionsByType(action) {
        return this.actionLog.filter(entry => entry.action === action);
    }
    /**
     * Get actions within a time range
     */
    getActionsInRange(start, end) {
        return this.actionLog.filter(entry => entry.timestamp >= start && entry.timestamp <= end);
    }
    /**
     * Clear the action log
     */
    clearLog() {
        this.actionLog = [];
        this.pendingActions.clear();
    }
    /**
     * Get the number of logged actions
     */
    getLogSize() {
        return this.actionLog.length;
    }
    /**
     * Get the maximum log size
     */
    getMaxSize() {
        return this.maxActions;
    }
    /**
     * Set the maximum log size
     */
    setMaxSize(maxActions) {
        this.maxActions = maxActions;
        // Trim if necessary
        while (this.actionLog.length > this.maxActions) {
            this.actionLog.shift();
        }
    }
    /**
     * Get pending actions (actions that started but haven't completed)
     */
    getPendingActions() {
        const result = [];
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
    cancelPendingAction(actionId) {
        return this.pendingActions.delete(actionId);
    }
}
// Singleton instance for global action logging
let globalActionLogger = null;
/**
 * Get the global action logger instance
 */
export function getActionLogger() {
    if (!globalActionLogger) {
        globalActionLogger = new ActionLogger();
    }
    return globalActionLogger;
}
/**
 * Initialize the global action logger with custom max size
 */
export function initializeActionLogger(maxActions) {
    globalActionLogger = new ActionLogger(maxActions);
    return globalActionLogger;
}
/**
 * Reset the global action logger (useful for testing)
 */
export function resetActionLogger() {
    globalActionLogger = null;
}
/**
 * Helper function to wrap an async function with action logging
 */
export async function withActionLogging(actionLogger, action, payload, fn) {
    const actionId = actionLogger.startAction(action, payload);
    try {
        const result = await fn();
        actionLogger.completeAction(actionId, 'success');
        return result;
    }
    catch (error) {
        actionLogger.completeAction(actionId, 'error');
        throw error;
    }
}
/**
 * Helper function to wrap a sync function with action logging
 */
export function withActionLoggingSync(actionLogger, action, payload, fn) {
    const actionId = actionLogger.startAction(action, payload);
    try {
        const result = fn();
        actionLogger.completeAction(actionId, 'success');
        return result;
    }
    catch (error) {
        actionLogger.completeAction(actionId, 'error');
        throw error;
    }
}
//# sourceMappingURL=action-logger.js.map