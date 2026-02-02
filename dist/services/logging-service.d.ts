/**
 * Structured logging service for Sous Chef
 * Provides ERROR, WARN, INFO, DEBUG levels with context-rich log entries
 */
import { LogLevel, LogEntry, LoggingConfig } from '../types/logging.js';
/**
 * Structured logging service with context-rich entries
 */
export declare class LoggingService {
    private config;
    private logBuffer;
    private maxBufferSize;
    constructor(config?: Partial<LoggingConfig>);
    /**
     * Update logging configuration
     */
    configure(config: Partial<LoggingConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): LoggingConfig;
    /**
     * Check if a log level should be logged based on current config
     */
    private shouldLog;
    /**
     * Create a log entry
     */
    private createEntry;
    /**
     * Process a log entry (console output, buffer storage)
     */
    private processEntry;
    /**
     * Output log entry to console with appropriate formatting
     */
    private outputToConsole;
    /**
     * Log an ERROR level message
     * Use for unrecoverable errors, crashes, data corruption
     */
    error(message: string, component: string, context?: Record<string, unknown>, error?: Error): void;
    /**
     * Log a WARN level message
     * Use for recoverable errors, fallbacks triggered, degraded functionality
     */
    warn(message: string, component: string, context?: Record<string, unknown>): void;
    /**
     * Log an INFO level message
     * Use for user actions, state transitions, feature usage
     */
    info(message: string, component: string, context?: Record<string, unknown>): void;
    /**
     * Log a DEBUG level message
     * Use for detailed operation traces (disabled in production)
     */
    debug(message: string, component: string, context?: Record<string, unknown>): void;
    /**
     * Get recent log entries from buffer
     */
    getRecentLogs(limit?: number, level?: LogLevel): LogEntry[];
    /**
     * Get error logs only
     */
    getErrorLogs(limit?: number): LogEntry[];
    /**
     * Clear the log buffer
     */
    clearLogs(): void;
    /**
     * Get buffer size
     */
    getBufferSize(): number;
}
/**
 * Get the global logging service instance
 */
export declare function getLogger(): LoggingService;
/**
 * Initialize the global logger with custom configuration
 */
export declare function initializeLogger(config: Partial<LoggingConfig>): LoggingService;
/**
 * Reset the global logger (useful for testing)
 */
export declare function resetLogger(): void;
//# sourceMappingURL=logging-service.d.ts.map