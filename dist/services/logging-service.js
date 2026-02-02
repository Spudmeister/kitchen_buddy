/**
 * Structured logging service for Sous Chef
 * Provides ERROR, WARN, INFO, DEBUG levels with context-rich log entries
 */
/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};
/**
 * Default logging configuration
 */
const DEFAULT_CONFIG = {
    minLevel: 'INFO',
    maxActionLogSize: 50,
    enableConsole: true,
    enablePersistence: false,
};
/**
 * Structured logging service with context-rich entries
 */
export class LoggingService {
    config;
    logBuffer = [];
    maxBufferSize = 1000;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Update logging configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Check if a log level should be logged based on current config
     */
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.config.minLevel];
    }
    /**
     * Create a log entry
     */
    createEntry(level, message, component, context, error) {
        const entry = {
            timestamp: new Date(),
            level,
            message,
            component,
        };
        if (context && Object.keys(context).length > 0) {
            entry.context = context;
        }
        if (error) {
            entry.error = {
                message: error.message,
                stack: error.stack,
                code: error.code,
            };
        }
        return entry;
    }
    /**
     * Process a log entry (console output, buffer storage)
     */
    processEntry(entry) {
        // Add to buffer
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }
        // Console output if enabled
        if (this.config.enableConsole) {
            this.outputToConsole(entry);
        }
    }
    /**
     * Output log entry to console with appropriate formatting
     */
    outputToConsole(entry) {
        const timestamp = entry.timestamp.toISOString();
        const prefix = `[${timestamp}] [${entry.level}] [${entry.component}]`;
        const message = `${prefix} ${entry.message}`;
        switch (entry.level) {
            case 'ERROR':
                if (entry.error) {
                    console.error(message, entry.context || '', entry.error);
                }
                else {
                    console.error(message, entry.context || '');
                }
                break;
            case 'WARN':
                console.warn(message, entry.context || '');
                break;
            case 'INFO':
                console.info(message, entry.context || '');
                break;
            case 'DEBUG':
                console.debug(message, entry.context || '');
                break;
        }
    }
    /**
     * Log an ERROR level message
     * Use for unrecoverable errors, crashes, data corruption
     */
    error(message, component, context, error) {
        if (!this.shouldLog('ERROR'))
            return;
        const entry = this.createEntry('ERROR', message, component, context, error);
        this.processEntry(entry);
    }
    /**
     * Log a WARN level message
     * Use for recoverable errors, fallbacks triggered, degraded functionality
     */
    warn(message, component, context) {
        if (!this.shouldLog('WARN'))
            return;
        const entry = this.createEntry('WARN', message, component, context);
        this.processEntry(entry);
    }
    /**
     * Log an INFO level message
     * Use for user actions, state transitions, feature usage
     */
    info(message, component, context) {
        if (!this.shouldLog('INFO'))
            return;
        const entry = this.createEntry('INFO', message, component, context);
        this.processEntry(entry);
    }
    /**
     * Log a DEBUG level message
     * Use for detailed operation traces (disabled in production)
     */
    debug(message, component, context) {
        if (!this.shouldLog('DEBUG'))
            return;
        const entry = this.createEntry('DEBUG', message, component, context);
        this.processEntry(entry);
    }
    /**
     * Get recent log entries from buffer
     */
    getRecentLogs(limit, level) {
        let logs = [...this.logBuffer];
        if (level) {
            logs = logs.filter(entry => entry.level === level);
        }
        if (limit && limit > 0) {
            logs = logs.slice(-limit);
        }
        return logs;
    }
    /**
     * Get error logs only
     */
    getErrorLogs(limit) {
        return this.getRecentLogs(limit, 'ERROR');
    }
    /**
     * Clear the log buffer
     */
    clearLogs() {
        this.logBuffer = [];
    }
    /**
     * Get buffer size
     */
    getBufferSize() {
        return this.logBuffer.length;
    }
}
// Singleton instance for global logging
let globalLogger = null;
/**
 * Get the global logging service instance
 */
export function getLogger() {
    if (!globalLogger) {
        globalLogger = new LoggingService();
    }
    return globalLogger;
}
/**
 * Initialize the global logger with custom configuration
 */
export function initializeLogger(config) {
    globalLogger = new LoggingService(config);
    return globalLogger;
}
/**
 * Reset the global logger (useful for testing)
 */
export function resetLogger() {
    globalLogger = null;
}
//# sourceMappingURL=logging-service.js.map