/**
 * Database management for Sous Chef using sql.js
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, CREATE_FTS_SQL, SCHEMA_VERSION } from './schema.js';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  /** Path to the database file. If not provided, uses in-memory database */
  filePath?: string;
  /** Enable WAL mode for better concurrent access (simulated for sql.js) */
  walMode?: boolean;
}

export class Database {
  private db: SqlJsDatabase | null = null;
  private config: DatabaseConfig;
  private initialized = false;

  constructor(config: DatabaseConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (this.config.filePath && fs.existsSync(this.config.filePath)) {
      const fileBuffer = fs.readFileSync(this.config.filePath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    // Apply schema
    await this.applySchema();

    this.initialized = true;
  }

  /**
   * Apply database schema and migrations
   */
  private async applySchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check current schema version
    const currentVersion = this.getSchemaVersion();

    if (currentVersion < SCHEMA_VERSION) {
      // Apply schema
      this.db.run(CREATE_TABLES_SQL);
      this.db.run(CREATE_INDEXES_SQL);
      
      // Try to create FTS table (may not be supported in all sql.js builds)
      try {
        this.db.run(CREATE_FTS_SQL);
      } catch {
        // FTS5 not supported, skip - full-text search will be unavailable
      }

      // Update schema version
      this.db.run(
        'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, datetime("now"))',
        [SCHEMA_VERSION]
      );
    }

    // Enable WAL mode simulation (sql.js doesn't support true WAL, but we set pragma for compatibility)
    if (this.config.walMode) {
      // sql.js runs in-memory, so WAL mode doesn't apply, but we can set it for API compatibility
      try {
        this.db.run('PRAGMA journal_mode = WAL');
      } catch {
        // Ignore if not supported
      }
    }
  }

  /**
   * Get the current schema version
   */
  private getSchemaVersion(): number {
    if (!this.db) {
      return 0;
    }

    try {
      const result = this.db.exec('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
      const firstResult = result[0];
      if (result.length > 0 && firstResult && firstResult.values.length > 0) {
        const firstRow = firstResult.values[0];
        const version = firstRow?.[0];
        return typeof version === 'number' ? version : 0;
      }
    } catch {
      // Table doesn't exist yet
    }
    return 0;
  }

  /**
   * Execute a SQL query and return results
   */
  exec(sql: string, params: unknown[] = []): unknown[][] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const results: unknown[][] = [];
    while (stmt.step()) {
      results.push(stmt.get());
    }
    stmt.free();

    return results;
  }

  /**
   * Execute a SQL query that returns a single row
   */
  get<T = unknown[]>(sql: string, params: unknown[] = []): T | undefined {
    const results = this.exec(sql, params);
    return results[0] as T | undefined;
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(sql, params);

    // Get changes and last insert rowid
    const changesResult = this.db.exec('SELECT changes()');
    const lastIdResult = this.db.exec('SELECT last_insert_rowid()');

    const changes = changesResult[0]?.values[0]?.[0];
    const lastId = lastIdResult[0]?.values[0]?.[0];

    return {
      changes: typeof changes === 'number' ? changes : 0,
      lastInsertRowid: typeof lastId === 'number' ? lastId : 0,
    };
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Save the database to file
   */
  save(): void {
    if (!this.db || !this.config.filePath) {
      return;
    }

    const data = this.db.export();
    const buffer = Buffer.from(data);

    // Ensure directory exists
    const dir = path.dirname(this.config.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.config.filePath, buffer);
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      // Save before closing if we have a file path
      if (this.config.filePath) {
        this.save();
      }
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the raw sql.js database instance (for advanced operations)
   */
  getRawDatabase(): SqlJsDatabase | null {
    return this.db;
  }
}

/**
 * Create and initialize a new database instance
 */
export async function createDatabase(config: DatabaseConfig = {}): Promise<Database> {
  const db = new Database(config);
  await db.initialize();
  return db;
}
