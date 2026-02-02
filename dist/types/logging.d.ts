/**
 * Logging and crash reproduction types for Sous Chef
 */
/**
 * Log levels for structured logging
 */
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
/**
 * A structured log entry with context
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    component: string;
    context?: Record<string, unknown>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}
/**
 * Result of a logged action
 */
export type ActionResult = 'success' | 'error';
/**
 * An entry in the action log for replay
 */
export interface ActionLogEntry {
    timestamp: Date;
    action: string;
    payload: unknown;
    result: ActionResult;
    duration: number;
}
/**
 * A pending operation that was in progress
 */
export interface PendingOperation {
    type: string;
    startedAt: Date;
    data: unknown;
    progress?: number;
}
/**
 * Application state snapshot for crash reports
 */
export interface AppStateSnapshot {
    currentView: string;
    activeRecipeId?: string;
    activeMenuId?: string;
    pendingOperations: PendingOperation[];
    preferences: Record<string, unknown>;
}
/**
 * A crash report capturing error and state
 */
export interface CrashReport {
    id: string;
    timestamp: Date;
    version: string;
    error: {
        message: string;
        stack?: string;
        code?: string;
    };
    state: AppStateSnapshot;
    actionLog: ActionLogEntry[];
    databaseSnapshot?: string;
}
/**
 * Configuration for the logging service
 */
export interface LoggingConfig {
    minLevel: LogLevel;
    maxActionLogSize: number;
    enableConsole: boolean;
    enablePersistence: boolean;
}
//# sourceMappingURL=logging.d.ts.map