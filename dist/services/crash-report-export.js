/**
 * Crash report export/import service for Sous Chef
 * Handles anonymized export and import of crash reports for debugging
 */
import { getCrashReportService } from './crash-report-service.js';
/**
 * Export format version for compatibility checking
 */
const EXPORT_FORMAT_VERSION = '1.0';
/**
 * Sensitive keys to redact from data
 */
const SENSITIVE_KEYS = [
    'password',
    'apikey',
    'api_key',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'email',
    'phone',
    'address',
    'name',
    'title',
    'description',
    'content',
    'text',
    'note',
    'comment',
];
/**
 * Crash report export service
 */
export class CrashReportExportService {
    crashReportService;
    constructor(crashReportService) {
        this.crashReportService = crashReportService || getCrashReportService();
    }
    /**
     * Check if a key is sensitive and should be redacted
     */
    isSensitiveKey(key) {
        const lowerKey = key.toLowerCase();
        return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
    }
    /**
     * Anonymize a value by hashing or redacting
     */
    anonymizeValue(value) {
        if (value === null || value === undefined) {
            return '[null]';
        }
        if (typeof value === 'string') {
            // Return hash of string for correlation without revealing content
            return `[string:${value.length}chars]`;
        }
        if (typeof value === 'number') {
            return '[number]';
        }
        if (typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value)) {
            return `[array:${value.length}items]`;
        }
        if (typeof value === 'object') {
            return `[object:${Object.keys(value).length}keys]`;
        }
        return '[unknown]';
    }
    /**
     * Anonymize the application state
     */
    anonymizeState(state) {
        return {
            currentView: state.currentView,
            hasActiveRecipe: !!state.activeRecipeId,
            hasActiveMenu: !!state.activeMenuId,
            pendingOperationCount: state.pendingOperations.length,
            pendingOperationTypes: state.pendingOperations.map(op => op.type),
            preferenceKeys: Object.keys(state.preferences),
        };
    }
    /**
     * Anonymize an action log entry
     */
    anonymizeActionLogEntry(entry) {
        return {
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            hasPayload: entry.payload !== null && entry.payload !== undefined,
            payloadType: typeof entry.payload,
            result: entry.result,
            duration: entry.duration,
        };
    }
    /**
     * Anonymize error stack trace (remove file paths that might contain usernames)
     */
    anonymizeStack(stack) {
        if (!stack)
            return undefined;
        // Replace file paths with generic placeholders
        return stack
            .replace(/\/Users\/[^/]+/g, '/Users/[USER]')
            .replace(/\/home\/[^/]+/g, '/home/[USER]')
            .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[USER]')
            .replace(/file:\/\/[^\s]+/g, 'file://[PATH]');
    }
    /**
     * Anonymize a crash report for export
     */
    anonymizeReport(report) {
        return {
            id: report.id,
            timestamp: report.timestamp.toISOString(),
            version: report.version,
            error: {
                message: report.error.message,
                stack: this.anonymizeStack(report.error.stack),
                code: report.error.code,
            },
            state: this.anonymizeState(report.state),
            actionLog: report.actionLog.map(entry => this.anonymizeActionLogEntry(entry)),
        };
    }
    /**
     * Export a crash report as anonymized JSON
     */
    exportReport(reportId) {
        const report = this.crashReportService.getReport(reportId);
        if (!report) {
            return null;
        }
        return {
            formatVersion: EXPORT_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            report: this.anonymizeReport(report),
        };
    }
    /**
     * Export a crash report as a JSON string
     */
    exportReportAsString(reportId) {
        const exported = this.exportReport(reportId);
        if (!exported) {
            return null;
        }
        return JSON.stringify(exported, null, 2);
    }
    /**
     * Export a crash report as a Blob for download
     */
    exportReportAsBlob(reportId) {
        const jsonString = this.exportReportAsString(reportId);
        if (!jsonString) {
            return null;
        }
        return new Blob([jsonString], { type: 'application/json' });
    }
    /**
     * Export all crash reports
     */
    exportAllReports() {
        const reports = this.crashReportService.getAllReports();
        return reports.map(report => ({
            formatVersion: EXPORT_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            report: this.anonymizeReport(report),
        }));
    }
    /**
     * Validate an imported crash report
     */
    validateImportedReport(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const obj = data;
        if (typeof obj.formatVersion !== 'string') {
            return false;
        }
        if (typeof obj.exportedAt !== 'string') {
            return false;
        }
        if (!obj.report || typeof obj.report !== 'object') {
            return false;
        }
        const report = obj.report;
        if (typeof report.id !== 'string') {
            return false;
        }
        if (typeof report.timestamp !== 'string') {
            return false;
        }
        if (!report.error || typeof report.error !== 'object') {
            return false;
        }
        if (!report.state || typeof report.state !== 'object') {
            return false;
        }
        if (!Array.isArray(report.actionLog)) {
            return false;
        }
        return true;
    }
    /**
     * Import a crash report from JSON string
     */
    importReport(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!this.validateImportedReport(data)) {
                throw new Error('Invalid crash report format');
            }
            // Convert anonymized report back to full report format
            // Note: Some data is lost during anonymization, so we reconstruct what we can
            const anonymizedReport = data.report;
            const report = this.crashReportService.createReportFromData({
                error: {
                    message: anonymizedReport.error.message,
                    stack: anonymizedReport.error.stack,
                    code: anonymizedReport.error.code,
                },
                state: {
                    currentView: anonymizedReport.state.currentView,
                    activeRecipeId: anonymizedReport.state.hasActiveRecipe ? '[imported]' : undefined,
                    activeMenuId: anonymizedReport.state.hasActiveMenu ? '[imported]' : undefined,
                    pendingOperations: anonymizedReport.state.pendingOperationTypes.map(type => ({
                        type,
                        startedAt: new Date(),
                        data: null,
                    })),
                    preferences: anonymizedReport.state.preferenceKeys.reduce((acc, key) => {
                        acc[key] = '[imported]';
                        return acc;
                    }, {}),
                },
                actionLog: anonymizedReport.actionLog.map(entry => ({
                    timestamp: new Date(entry.timestamp),
                    action: entry.action,
                    payload: entry.hasPayload ? '[imported]' : null,
                    result: entry.result,
                    duration: entry.duration,
                })),
                timestamp: new Date(anonymizedReport.timestamp),
            });
            return report;
        }
        catch (error) {
            console.error('Failed to import crash report:', error);
            return null;
        }
    }
    /**
     * Import a crash report from a Blob
     */
    async importReportFromBlob(blob) {
        try {
            const text = await blob.text();
            return this.importReport(text);
        }
        catch (error) {
            console.error('Failed to read crash report blob:', error);
            return null;
        }
    }
    /**
     * Import multiple crash reports
     */
    importReports(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                // Single report
                const report = this.importReport(jsonString);
                return report ? [report] : [];
            }
            // Multiple reports
            const reports = [];
            for (const item of data) {
                const itemString = JSON.stringify(item);
                const report = this.importReport(itemString);
                if (report) {
                    reports.push(report);
                }
            }
            return reports;
        }
        catch (error) {
            console.error('Failed to import crash reports:', error);
            return [];
        }
    }
    /**
     * Get format version
     */
    getFormatVersion() {
        return EXPORT_FORMAT_VERSION;
    }
}
// Singleton instance
let globalExportService = null;
/**
 * Get the global crash report export service instance
 */
export function getCrashReportExportService() {
    if (!globalExportService) {
        globalExportService = new CrashReportExportService();
    }
    return globalExportService;
}
/**
 * Initialize the global crash report export service
 */
export function initializeCrashReportExportService(crashReportService) {
    globalExportService = new CrashReportExportService(crashReportService);
    return globalExportService;
}
/**
 * Reset the global crash report export service (useful for testing)
 */
export function resetCrashReportExportService() {
    globalExportService = null;
}
//# sourceMappingURL=crash-report-export.js.map