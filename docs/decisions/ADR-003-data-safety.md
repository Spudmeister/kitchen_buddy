# ADR-003: The recipe database is an append-only ledger with verified snapshots

**Status:** Accepted
**Date:** 2026-09-07

## Context

People will pour their lives into this recipe book. Losing it is the one
unacceptable failure. At the same time search and browsing must stay fast at
thousands of recipes.

## Decision

**Storage.** SQLite via GRDB 7 at `Application Support/KitchenBuddy/kitchenbuddy.sqlite`
(explicitly included in device backups). `DatabasePool`, WAL, foreign keys on,
`PRAGMA synchronous = FULL` (recipe writes are tiny and rare; power-loss
durability matters more than the extra fsync), file protection
`completeUntilFirstUserAuthentication` so background snapshots work while locked.

**Write discipline.** Soft delete only (`archived_at`, `deleted_at`).
Versions, ingredients, instructions, and ratings are append-only and
immutable. `BEFORE DELETE` / `BEFORE UPDATE` triggers `RAISE(ABORT)` on every
user-content table, so a bug throws instead of destroying data. Only
`recipe_tags`, the derived search tables, and `preferences` may be rewritten.
Every write is one transaction that also refreshes the search projection.

**Search.** A denormalized `recipe_search` row per recipe (also the browse and
sort table) with an FTS5 external-content index (`unicode61 remove_diacritics 2`,
prefix index, bm25 weights title > tags > ingredients > description > steps),
kept in sync inside the same transaction. Rebuildable at any time.

**Snapshots.** `VACUUM INTO Backups/kb-<timestamp>-<reason>.sqlite` — a
self-contained copy in one statement. Taken on background when there are
changes and ≥ 1 h since the last, daily, before migrations, before imports,
before restores, and on demand. Each snapshot is **verified** (opened
read-only, `PRAGMA integrity_check`, recipe count ≥ live) before it can
displace older ones; failed ones are renamed `.bad` and pruning is skipped for
that run. Retention: last 7 auto + first of each of the last 4 weeks + every
pre-migration snapshot forever + recent pre-import/pre-restore/manual; never
delete the only verified snapshot.

**Recovery.** At launch `PRAGMA quick_check`. On failure the live file is
**renamed** into `Damaged/` (never deleted), the newest verified snapshot is
restored, and a non-dismissable notice explains what happened and offers to
export the damaged file. There is never a "delete and start fresh" button.

**Off-device.** The newest verified snapshot (+ new photos) is mirrored into
the iCloud Drive container `iCloud.net.puddleglum.kitchenbuddy`, visible in
the Files app so the owner can see the backups exist. Full CloudKit sync is a
later project; every table has UUID keys, `updated_at`, and tombstones so it
is not precluded.

**Migrations.** `DatabaseMigrator` with `eraseDatabaseOnSchemaChange = false`
always. Migrations only add. A fixture database per schema version is
committed and must open forever.

**Photos.** Files under `Photos/<uuid>.jpg` (JPEG ≤ 2048 px, PNG kept);
removal moves the file to `Photos/Trash/` and purges after 30 days — the only
code path that deletes photo bytes.

## Consequences

- Row counts of recipes, versions, ratings, and notes never decrease under any
  public operation (property P6); this is tested with fuzzed sequences.
- Storage grows monotonically; at recipe-book scale that is megabytes.
- "Delete" in the UI is always "archive", and the UI says so.
