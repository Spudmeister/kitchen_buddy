/**
 * Database management for Sous Chef using sql.js
 */
import { Database as SqlJsDatabase } from 'sql.js';
export interface DatabaseConfig {
    /** Path to the database file. If not provided, uses in-memory database */
    filePath?: string;
    /** Enable WAL mode for better concurrent access (simulated for sql.js) */
    walMode?: boolean;
}
export declare class Database {
    private db;
    private config;
    private initialized;
    constructor(config?: DatabaseConfig);
    /**
     * Initialize the database connection and schema
     */
    initialize(): Promise<void>;
    /**
     * Apply database schema and migrations
     */
    private applySchema;
    /**
     * Get the current schema version
     */
    private getSchemaVersion;
    /**
     * Execute a SQL query and return results
     */
    exec(sql: string, params?: unknown[]): unknown[][];
    /**
     * Execute a SQL query that returns a single row
     */
    get<T = unknown[]>(sql: string, params?: unknown[]): T | undefined;
    /**
     * Execute a SQL statement (INSERT, UPDATE, DELETE)
     */
    run(sql: string, params?: unknown[]): {
        changes: number;
        lastInsertRowid: number;
    };
    /**
     * Execute multiple SQL statements in a transaction
     */
    transaction<T>(fn: () => T): T;
    /**
     * Save the database to file
     */
    save(): void;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Check if the database is initialized
     */
    isInitialized(): boolean;
    /**
     * Get the raw sql.js database instance (for advanced operations)
     */
    getRawDatabase(): SqlJsDatabase | null;
}
/**
 * Create and initialize a new database instance
 */
export declare function createDatabase(config?: DatabaseConfig): Promise<Database>;
//# sourceMappingURL=database.d.ts.map