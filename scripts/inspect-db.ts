/**
 * SQLite Inspector Script for Sous Chef development/debugging.
 *
 * Usage:
 *   npx tsx scripts/inspect-db.ts <path-to-db-file> [sql-query]
 *   npm run inspect-db -- <path-to-db-file> [sql-query]
 *
 * Requirements:
 *   - better-sqlite3:        npm install -D better-sqlite3 @types/better-sqlite3
 *   - tsx:                   npm install -D tsx
 *   (Both are already in devDependencies after initial setup.)
 */

import Database from 'better-sqlite3';
import { existsSync, statSync } from 'fs';

// ---------------------------------------------------------------------------
// ASCII table printer
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function printTable(rows: Row[]): void {
  if (rows.length === 0) {
    console.log('  (no rows)\n');
    return;
  }

  const columns = Object.keys(rows[0]);

  // Compute column widths (header vs data)
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
  }
  for (const row of rows) {
    for (const col of columns) {
      const val = row[col] === null || row[col] === undefined ? 'NULL' : String(row[col]);
      if (val.length > widths[col]) {
        widths[col] = val.length;
      }
    }
  }

  const separator = '+' + columns.map((c) => '-'.repeat(widths[c] + 2)).join('+') + '+';
  const header =
    '|' + columns.map((c) => ` ${c.padEnd(widths[c])} `).join('|') + '|';

  console.log(separator);
  console.log(header);
  console.log(separator);
  for (const row of rows) {
    const line =
      '|' +
      columns
        .map((c) => {
          const val =
            row[c] === null || row[c] === undefined ? 'NULL' : String(row[c]);
          return ` ${val.padEnd(widths[c])} `;
        })
        .join('|') +
      '|';
    console.log(line);
  }
  console.log(separator);
  console.log(`  ${rows.length} row${rows.length === 1 ? '' : 's'}\n`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionHeader(title: string): void {
  const line = '='.repeat(title.length + 4);
  console.log('\n' + line);
  console.log(`  ${title}`);
  console.log(line);
}

function openDatabase(dbPath: string): Database.Database {
  if (!existsSync(dbPath)) {
    console.error(`Error: File not found: ${dbPath}`);
    process.exit(1);
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(dbPath);
  } catch (err) {
    console.error(`Error: Cannot stat file: ${dbPath}`);
    process.exit(1);
  }

  if (!stat.isFile()) {
    console.error(`Error: Path is not a regular file: ${dbPath}`);
    process.exit(1);
  }

  let db: Database.Database;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Could not open SQLite database at "${dbPath}": ${message}`);
    process.exit(1);
  }

  // Validate it is actually SQLite by running a trivial query
  try {
    db.prepare('SELECT sqlite_version()').get();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: File does not appear to be a valid SQLite database: ${message}`);
    process.exit(1);
  }

  return db;
}

// ---------------------------------------------------------------------------
// Default overview mode
// ---------------------------------------------------------------------------

function runOverview(db: Database.Database): void {
  // --- Table names and row counts ---
  sectionHeader('Tables and Row Counts');

  const tableRows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all() as { name: string }[];

  if (tableRows.length === 0) {
    console.log('  (no tables found)\n');
  } else {
    const counts: { table_name: string; row_count: number }[] = [];
    for (const { name } of tableRows) {
      const result = db.prepare(`SELECT COUNT(*) AS cnt FROM "${name}"`).get() as {
        cnt: number;
      };
      counts.push({ table_name: name, row_count: result.cnt });
    }
    printTable(counts as unknown as Row[]);
  }

  // --- recipes table (most recent 20) ---
  const recipesExists = tableRows.some((r) => r.name === 'recipes');
  if (recipesExists) {
    sectionHeader('recipes (most recent 20)');
    // Join to recipe_versions to get the title for the current version
    const recipeVersionsExists = tableRows.some((r) => r.name === 'recipe_versions');
    let recipeRows: Row[];
    if (recipeVersionsExists) {
      recipeRows = db
        .prepare(
          `SELECT r.id,
                  rv.title,
                  r.archived_at,
                  r.created_at
           FROM recipes r
           LEFT JOIN recipe_versions rv
             ON rv.recipe_id = r.id AND rv.version = r.current_version
           ORDER BY r.created_at DESC
           LIMIT 20`
        )
        .all() as Row[];
    } else {
      recipeRows = db
        .prepare(
          `SELECT id, archived_at, created_at
           FROM recipes
           ORDER BY created_at DESC
           LIMIT 20`
        )
        .all() as Row[];
    }
    printTable(recipeRows);
  }

  // --- recipe_versions table (most recent 10 per recipe) ---
  const versionsExists = tableRows.some((r) => r.name === 'recipe_versions');
  if (versionsExists) {
    sectionHeader('recipe_versions (most recent 10 per recipe)');
    const versionRows = db
      .prepare(
        `SELECT recipe_id, version AS version_number, created_at
         FROM recipe_versions
         WHERE version IN (
           SELECT version
           FROM recipe_versions rv2
           WHERE rv2.recipe_id = recipe_versions.recipe_id
           ORDER BY version DESC
           LIMIT 10
         )
         ORDER BY recipe_id, version DESC`
      )
      .all() as Row[];
    printTable(versionRows);
  }

  // --- cook_sessions table ---
  const sessionsExists = tableRows.some((r) => r.name === 'cook_sessions');
  if (sessionsExists) {
    sectionHeader('cook_sessions');
    const countRow = db
      .prepare(`SELECT COUNT(*) AS total_sessions FROM cook_sessions`)
      .get() as { total_sessions: number };
    console.log(`  Total sessions: ${countRow.total_sessions}\n`);

    console.log('  Most recent 10:');
    const sessionRows = db
      .prepare(
        `SELECT id, recipe_id, date, actual_prep_minutes, actual_cook_minutes, servings_made
         FROM cook_sessions
         ORDER BY date DESC
         LIMIT 10`
      )
      .all() as Row[];
    printTable(sessionRows);
  }
}

// ---------------------------------------------------------------------------
// Custom query mode
// ---------------------------------------------------------------------------

function runQuery(db: Database.Database, sql: string): void {
  let stmt: Database.Statement;
  try {
    stmt = db.prepare(sql);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to prepare SQL statement: ${message}`);
    process.exit(1);
  }

  // Detect whether this is a SELECT-style or write statement
  const isQuery = stmt.reader;

  if (isQuery) {
    let rows: Row[];
    try {
      rows = stmt.all() as Row[];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: Query execution failed: ${message}`);
      process.exit(1);
    }
    sectionHeader('Query Results');
    console.log(`  SQL: ${sql}\n`);
    printTable(rows);
  } else {
    // Running in readonly mode — write statements will throw
    console.error(
      'Error: The database is opened in read-only mode. Only SELECT queries are supported.'
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(
      [
        '',
        'Usage:',
        '  npx tsx scripts/inspect-db.ts <db-file> [sql-query]',
        '  npm run inspect-db -- <db-file> [sql-query]',
        '',
        'Arguments:',
        '  <db-file>    Path to a SQLite .db file exported from the browser',
        '  [sql-query]  Optional SQL SELECT query to run and pretty-print',
        '',
        'Examples:',
        '  npm run inspect-db -- ~/Downloads/sous-chef-export.db',
        '  npm run inspect-db -- ~/Downloads/sous-chef-export.db "SELECT * FROM tags"',
        '',
      ].join('\n')
    );
    process.exit(0);
  }

  const dbPath = args[0];
  const query = args.slice(1).join(' ').trim() || null;

  console.log(`\nInspecting: ${dbPath}`);

  const db = openDatabase(dbPath);

  if (query) {
    runQuery(db, query);
  } else {
    runOverview(db);
  }

  db.close();
}

main();
