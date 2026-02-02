/**
 * Crash report service for Sous Chef
 * Captures application state on errors for debugging and reproduction
 */
import { getActionLogger } from './action-logger.js';
import { getLogger } from './logging-service.js';
/**
 * Application version (should be injected from build)
 */
const APP_VERSION = '1.0.0';
/**
 * Maximum number of crash reports to keep
 */
const MAX_CRASH_REPORTS = 10;
/**
 * Default state provider when no custom provider is set
 */
const defaultStateProvider = {
    getCurrentView: () => 'unknown',
    getActiveRecipeId: () => undefined,
    getActiveMenuId: () => undefined,
    getPendingOperations: () => [],
    getPreferences: () => ({}),
};
/**
 * Crash report service for capturing and managing crash reports
 */
export class CrashReportService {
    crashReports = [];
    stateProvider;
    actionLogger;
    logger;
    maxReports;
    constructor(stateProvider = defaultStateProvider, actionLogger, logger, maxReports = MAX_CRASH_REPORTS) {
        this.stateProvider = stateProvider;
        this.actionLogger = actionLogger || getActionLogger();
        this.logger = logger || getLogger();
        this.maxReports = maxReports;
    }
    /**
     * Set the state provider
     */
    setStateProvider(provider) {
        this.stateProvider = provider;
    }
    /**
     * Generate a unique crash report ID
     */
    generateReportId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `crash-${timestamp}-${random}`;
    }
    /**
     * Capture the current application state
     */
    captureAppState() {
        return {
            currentView: this.stateProvider.getCurrentView(),
            activeRecipeId: this.stateProvider.getActiveRecipeId(),
            activeMenuId: this.stateProvider.getActiveMenuId(),
            pendingOperations: this.stateProvider.getPendingOperations(),
            preferences: this.stateProvider.getPreferences(),
        };
    }
    /**
     * Capture state on error and create a crash report
     */
    captureState(error) {
        const report = {
            id: this.generateReportId(),
            timestamp: new Date(),
            version: APP_VERSION,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
            },
            state: this.captureAppState(),
            actionLog: this.actionLogger.getActionLog(),
        };
        // Store the report
        this.crashReports.push(report);
        // Trim to max size
        while (this.crashReports.length > this.maxReports) {
            this.crashReports.shift();
        }
        // Log the crash
        this.logger.error('Crash report captured', 'CrashReportService', { reportId: report.id }, error);
        return report;
    }
    /**
     * Capture state with additional context
     */
    captureStateWithContext(error, additionalContext) {
        const report = this.captureState(error);
        // Add additional context to the state
        report.state.preferences = {
            ...report.state.preferences,
            _additionalContext: additionalContext,
        };
        return report;
    }
    /**
     * Get a crash report by ID
     */
    getReport(reportId) {
        return this.crashReports.find(report => report.id === reportId);
    }
    /**
     * Get recent crash reports
     */
    getRecentCrashes(limit) {
        const reports = [...this.crashReports].reverse();
        if (limit && limit > 0) {
            return reports.slice(0, limit);
        }
        return reports;
    }
    /**
     * Get all crash reports
     */
    getAllReports() {
        return [...this.crashReports];
    }
    /**
     * Delete a crash report
     */
    deleteReport(reportId) {
        const index = this.crashReports.findIndex(report => report.id === reportId);
        if (index !== -1) {
            this.crashReports.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Clear all crash reports
     */
    clearReports() {
        this.crashReports = [];
    }
    /**
     * Get the number of stored crash reports
     */
    getReportCount() {
        return this.crashReports.length;
    }
    /**
     * Add a pending operation to track
     */
    addPendingOperation(operation) {
        const currentOps = this.stateProvider.getPendingOperations();
        currentOps.push(operation);
    }
    /**
     * Create a crash report from raw data (for importing)
     */
    createReportFromData(data) {
        const report = {
            id: this.generateReportId(),
            timestamp: data.timestamp || new Date(),
            version: APP_VERSION,
            error: data.error,
            state: data.state,
            actionLog: data.actionLog,
            databaseSnapshot: data.databaseSnapshot,
        };
        this.crashReports.push(report);
        // Trim to max size
        while (this.crashReports.length > this.maxReports) {
            this.crashReports.shift();
        }
        return report;
    }
    /**
     * Set the maximum number of reports to keep
     */
    setMaxReports(max) {
        this.maxReports = max;
        while (this.crashReports.length > this.maxReports) {
            this.crashReports.shift();
        }
    }
}
// Singleton instance
let globalCrashReportService = null;
/**
 * Get the global crash report service instance
 */
export function getCrashReportService() {
    if (!globalCrashReportService) {
        globalCrashReportService = new CrashReportService();
    }
    return globalCrashReportService;
}
/**
 * Initialize the global crash report service with a state provider
 */
export function initializeCrashReportService(stateProvider, actionLogger, logger) {
    globalCrashReportService = new CrashReportService(stateProvider, actionLogger, logger);
    return globalCrashReportService;
}
/**
 * Reset the global crash report service (useful for testing)
 */
export function resetCrashReportService() {
    globalCrashReportService = null;
}
/**
 * Global error handler that captures crash reports
 * Note: This function sets up handlers for uncaught exceptions in Node.js
 */
export function setupGlobalErrorHandler(service) {
    const crashService = service || getCrashReportService();
    // Handle Node.js uncaught exceptions
    if (typeof process !== 'undefined' && process.on) {
        process.on('uncaughtException', (error) => {
            crashService.captureState(error);
        });
        process.on('unhandledRejection', (reason) => {
            const error = reason instanceof Error
                ? reason
                : new Error(String(reason));
            crashService.captureState(error);
        });
    }
}
/**
 * Setup browser error handlers (call this in browser environment)
 * This is separated to avoid TypeScript errors in Node.js-only builds
 */
export function setupBrowserErrorHandler(service, windowObj) {
    windowObj.addEventListener('error', (event) => {
        service.captureState(event.error || new Error(event.message || 'Unknown error'));
    });
    windowObj.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        service.captureState(error);
    });
}
//# sourceMappingURL=crash-report-service.js.map