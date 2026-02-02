/**
 * Browser Database - sql.js wrapper with IndexedDB persistence
 * 
 * Provides SQLite database functionality in the browser using sql.js (WebAssembly)
 * with automatic persistence to IndexedDB.
 * 
 * Requirements: 1.3, 1.4
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { openDB, IDBPDatabase } from 'idb';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'sous-chef-db';
const DB_STORE = 'database';
const DB_KEY = 'main';
const IDB_VERSION = 1;

// Debounce timer for persistence
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 1000;

// Singleton instance
let browserDbInstance: BrowserDatabase | null = null;

/**
 * Browser-compatible database wrapper for sql.js
 */
export class BrowserDatabase {
  private db: SqlJsDatabase | null = null;
  private idb: IDBPDatabase | null = null;
  private initialized = false;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize sql.js with WASM
    const SQL = await initSqlJs({
      // Load WASM from local public folder
      locateFile: (file) => `/${file}`,
    });

    // Open IndexedDB for persistence
    this.idb = await openDB(DB_NAME, IDB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      },
    });

    // Try to load existing database from IndexedDB
    const savedData = await this.loadFromIndexedDB();
    if (savedData) {
      this.db = new SQL.Database(savedData);
    } else {
      this.db = new SQL.Database();
      await this.applySchema();
    }

    this.initialized = true;
  }

  /**
   * Load database from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    if (!this.idb) return null;

    try {
      const data = await this.idb.get(DB_STORE, DB_KEY);
      if (data instanceof Uint8Array) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save database to IndexedDB
   */
  async persist(): Promise<void> {
    if (!this.db || !this.idb) return;

    const data = this.db.export();
    await this.idb.put(DB_STORE, data, DB_KEY);
  }

  /**
   * Schedule a debounced persist operation
   */
  private schedulePersist(): void {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      this.persist().catch(console.error);
      persistTimer = null;
    }, PERSIST_DEBOUNCE_MS);
  }

  /**
   * Apply database schema
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

      // Update schema version
      this.db.run(
        'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, datetime("now"))',
        [SCHEMA_VERSION]
      );

      // Persist after schema changes
      await this.persist();
    }
  }

  /**
   * Get the current schema version
   */
  private getSchemaVersion(): number {
    if (!this.db) return 0;

    try {
      const result = this.db.exec(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      if (result.length > 0 && result[0]?.values.length) {
        const version = result[0].values[0]?.[0];
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

    // Schedule persistence after write operations
    this.schedulePersist();

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
      // Schedule persistence after transaction
      this.schedulePersist();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Force immediate persistence
   */
  async flush(): Promise<void> {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    await this.persist();
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // Flush any pending writes
    await this.flush();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }

    this.initialized = false;
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

  /**
   * Clear all data from the database
   */
  async clearAllData(): Promise<void> {
    if (!this.idb) return;

    // Delete from IndexedDB
    await this.idb.delete(DB_STORE, DB_KEY);

    // Reinitialize with fresh database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
    await this.initialize();
  }

  /**
   * Export database as Uint8Array
   */
  export(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  /**
   * Import database from Uint8Array
   */
  async import(data: Uint8Array): Promise<void> {
    if (!this.idb) {
      throw new Error('IndexedDB not initialized');
    }

    // Close existing database
    if (this.db) {
      this.db.close();
    }

    // Initialize sql.js
    const SQL = await initSqlJs({
      locateFile: (file) => `/${file}`,
    });

    // Create new database from imported data
    this.db = new SQL.Database(data);

    // Persist to IndexedDB
    await this.persist();
  }
}

/**
 * Get the singleton database instance
 */
export function getDatabase(): BrowserDatabase {
  if (!browserDbInstance) {
    browserDbInstance = new BrowserDatabase();
  }
  return browserDbInstance;
}

/**
 * Initialize the database (call once at app startup)
 */
export async function initializeDatabase(): Promise<BrowserDatabase> {
  const db = getDatabase();
  await db.initialize();
  return db;
}

/**
 * Create a fresh database instance (for testing)
 */
export async function createBrowserDatabase(): Promise<BrowserDatabase> {
  const db = new BrowserDatabase();
  await db.initialize();
  return db;
}
