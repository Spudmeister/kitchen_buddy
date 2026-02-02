/**
 * Crash report export/import service for Sous Chef
 * Handles anonymized export and import of crash reports for debugging
 */
import { CrashReport } from '../types/logging.js';
import { CrashReportService } from './crash-report-service.js';
/**
 * Exported crash report format
 */
export interface ExportedCrashReport {
    formatVersion: string;
    exportedAt: string;
    report: AnonymizedCrashReport;
}
/**
 * Anonymized crash report for sharing
 */
export interface AnonymizedCrashReport {
    id: string;
    timestamp: string;
    version: string;
    error: {
        message: string;
        stack?: string;
        code?: string;
    };
    state: AnonymizedAppState;
    actionLog: AnonymizedActionLogEntry[];
}
/**
 * Anonymized application state
 */
export interface AnonymizedAppState {
    currentView: string;
    hasActiveRecipe: boolean;
    hasActiveMenu: boolean;
    pendingOperationCount: number;
    pendingOperationTypes: string[];
    preferenceKeys: string[];
}
/**
 * Anonymized action log entry
 */
export interface AnonymizedActionLogEntry {
    timestamp: string;
    action: string;
    hasPayload: boolean;
    payloadType: string;
    result: 'success' | 'error';
    duration: number;
}
/**
 * Crash report export service
 */
export declare class CrashReportExportService {
    private crashReportService;
    constructor(crashReportService?: CrashReportService);
    /**
     * Check if a key is sensitive and should be redacted
     */
    private isSensitiveKey;
    /**
     * Anonymize a value by hashing or redacting
     */
    private anonymizeValue;
    /**
     * Anonymize the application state
     */
    private anonymizeState;
    /**
     * Anonymize an action log entry
     */
    private anonymizeActionLogEntry;
    /**
     * Anonymize error stack trace (remove file paths that might contain usernames)
     */
    private anonymizeStack;
    /**
     * Anonymize a crash report for export
     */
    private anonymizeReport;
    /**
     * Export a crash report as anonymized JSON
     */
    exportReport(reportId: string): ExportedCrashReport | null;
    /**
     * Export a crash report as a JSON string
     */
    exportReportAsString(reportId: string): string | null;
    /**
     * Export a crash report as a Blob for download
     */
    exportReportAsBlob(reportId: string): Blob | null;
    /**
     * Export all crash reports
     */
    exportAllReports(): ExportedCrashReport[];
    /**
     * Validate an imported crash report
     */
    private validateImportedReport;
    /**
     * Import a crash report from JSON string
     */
    importReport(jsonString: string): CrashReport | null;
    /**
     * Import a crash report from a Blob
     */
    importReportFromBlob(blob: Blob): Promise<CrashReport | null>;
    /**
     * Import multiple crash reports
     */
    importReports(jsonString: string): CrashReport[];
    /**
     * Get format version
     */
    getFormatVersion(): string;
}
/**
 * Get the global crash report export service instance
 */
export declare function getCrashReportExportService(): CrashReportExportService;
/**
 * Initialize the global crash report export service
 */
export declare function initializeCrashReportExportService(crashReportService: CrashReportService): CrashReportExportService;
/**
 * Reset the global crash report export service (useful for testing)
 */
export declare function resetCrashReportExportService(): void;
//# sourceMappingURL=crash-report-export.d.ts.map