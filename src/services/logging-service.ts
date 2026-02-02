/**
 * Structured logging service for Sous Chef
 * Provides ERROR, WARN, INFO, DEBUG levels with context-rich log entries
 */

import {
  LogLevel,
  LogEntry,
  LoggingConfig,
} from '../types/logging.js';

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG: LoggingConfig = {
  minLevel: 'INFO',
  maxActionLogSize: 50,
  enableConsole: true,
  enablePersistence: false,
};

/**
 * Structured logging service with context-rich entries
 */
export class LoggingService {
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update logging configuration
   */
  configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Check if a log level should be logged based on current config
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
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
        code: (error as Error & { code?: string }).code,
      };
    }

    return entry;
  }

  /**
   * Process a log entry (console output, buffer storage)
   */
  private processEntry(entry: LogEntry): void {
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
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level}] [${entry.component}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'ERROR':
        if (entry.error) {
          console.error(message, entry.context || '', entry.error);
        } else {
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
  error(
    message: string,
    component: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog('ERROR')) return;
    const entry = this.createEntry('ERROR', message, component, context, error);
    this.processEntry(entry);
  }

  /**
   * Log a WARN level message
   * Use for recoverable errors, fallbacks triggered, degraded functionality
   */
  warn(
    message: string,
    component: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('WARN')) return;
    const entry = this.createEntry('WARN', message, component, context);
    this.processEntry(entry);
  }

  /**
   * Log an INFO level message
   * Use for user actions, state transitions, feature usage
   */
  info(
    message: string,
    component: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('INFO')) return;
    const entry = this.createEntry('INFO', message, component, context);
    this.processEntry(entry);
  }

  /**
   * Log a DEBUG level message
   * Use for detailed operation traces (disabled in production)
   */
  debug(
    message: string,
    component: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('DEBUG')) return;
    const entry = this.createEntry('DEBUG', message, component, context);
    this.processEntry(entry);
  }

  /**
   * Get recent log entries from buffer
   */
  getRecentLogs(limit?: number, level?: LogLevel): LogEntry[] {
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
  getErrorLogs(limit?: number): LogEntry[] {
    return this.getRecentLogs(limit, 'ERROR');
  }

  /**
   * Clear the log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.logBuffer.length;
  }
}

// Singleton instance for global logging
let globalLogger: LoggingService | null = null;

/**
 * Get the global logging service instance
 */
export function getLogger(): LoggingService {
  if (!globalLogger) {
    globalLogger = new LoggingService();
  }
  return globalLogger;
}

/**
 * Initialize the global logger with custom configuration
 */
export function initializeLogger(config: Partial<LoggingConfig>): LoggingService {
  globalLogger = new LoggingService(config);
  return globalLogger;
}

/**
 * Reset the global logger (useful for testing)
 */
export function resetLogger(): void {
  globalLogger = null;
}
