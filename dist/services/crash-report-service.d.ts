/**
 * Crash report service for Sous Chef
 * Captures application state on errors for debugging and reproduction
 */
import { CrashReport, AppStateSnapshot, PendingOperation, ActionLogEntry } from '../types/logging.js';
import { ActionLogger } from './action-logger.js';
import { LoggingService } from './logging-service.js';
/**
 * State provider interface for capturing application state
 */
export interface StateProvider {
    getCurrentView(): string;
    getActiveRecipeId(): string | undefined;
    getActiveMenuId(): string | undefined;
    getPendingOperations(): PendingOperation[];
    getPreferences(): Record<string, unknown>;
}
/**
 * Crash report service for capturing and managing crash reports
 */
export declare class CrashReportService {
    private crashReports;
    private stateProvider;
    private actionLogger;
    private logger;
    private maxReports;
    constructor(stateProvider?: StateProvider, actionLogger?: ActionLogger, logger?: LoggingService, maxReports?: number);
    /**
     * Set the state provider
     */
    setStateProvider(provider: StateProvider): void;
    /**
     * Generate a unique crash report ID
     */
    private generateReportId;
    /**
     * Capture the current application state
     */
    private captureAppState;
    /**
     * Capture state on error and create a crash report
     */
    captureState(error: Error): CrashReport;
    /**
     * Capture state with additional context
     */
    captureStateWithContext(error: Error, additionalContext: Record<string, unknown>): CrashReport;
    /**
     * Get a crash report by ID
     */
    getReport(reportId: string): CrashReport | undefined;
    /**
     * Get recent crash reports
     */
    getRecentCrashes(limit?: number): CrashReport[];
    /**
     * Get all crash reports
     */
    getAllReports(): CrashReport[];
    /**
     * Delete a crash report
     */
    deleteReport(reportId: string): boolean;
    /**
     * Clear all crash reports
     */
    clearReports(): void;
    /**
     * Get the number of stored crash reports
     */
    getReportCount(): number;
    /**
     * Add a pending operation to track
     */
    addPendingOperation(operation: PendingOperation): void;
    /**
     * Create a crash report from raw data (for importing)
     */
    createReportFromData(data: {
        error: {
            message: string;
            stack?: string;
            code?: string;
        };
        state: AppStateSnapshot;
        actionLog: ActionLogEntry[];
        timestamp?: Date;
        databaseSnapshot?: string;
    }): CrashReport;
    /**
     * Set the maximum number of reports to keep
     */
    setMaxReports(max: number): void;
}
/**
 * Get the global crash report service instance
 */
export declare function getCrashReportService(): CrashReportService;
/**
 * Initialize the global crash report service with a state provider
 */
export declare function initializeCrashReportService(stateProvider: StateProvider, actionLogger?: ActionLogger, logger?: LoggingService): CrashReportService;
/**
 * Reset the global crash report service (useful for testing)
 */
export declare function resetCrashReportService(): void;
/**
 * Global error handler that captures crash reports
 * Note: This function sets up handlers for uncaught exceptions in Node.js
 */
export declare function setupGlobalErrorHandler(service?: CrashReportService): void;
/**
 * Setup browser error handlers (call this in browser environment)
 * This is separated to avoid TypeScript errors in Node.js-only builds
 */
export declare function setupBrowserErrorHandler(service: CrashReportService, windowObj: {
    addEventListener: (type: string, listener: (event: {
        error?: Error;
        message?: string;
        reason?: unknown;
    }) => void) => void;
}): void;
//# sourceMappingURL=crash-report-service.d.ts.map