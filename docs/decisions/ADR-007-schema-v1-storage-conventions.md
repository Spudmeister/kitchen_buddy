# ADR-007: Schema v1 storage conventions

**Status:** Accepted
**Date:** 2026-09-08

## Context

M1 wrote the first migration and the stores. A few representation choices
will be locked in by every later migration and by the export format, so they
are recorded here rather than left implicit in `SchemaV1.swift`.

## Decision

- **Timestamps** are ISO-8601 UTC text with millisecond precision
  (`2026-09-08T14:03:07.250Z`): readable in any SQLite browser, sort
  lexicographically, and round-trip exactly. Every date passes through
  `Timestamp.normalize` at the store boundary so a value the store returns
  equals the value a later fetch returns. GRDB's own date coding is not used.
- **Quantities** are stored as `quantity_num` / `quantity_den` integer pairs
  (normalized `Fraction`), with a generated `quantity_value` REAL for ad-hoc
  SQL. Quantity and unit are both nullable.
- **Ids** are lowercase UUID strings, one `Tagged<Entity>` type per table.
- **`recipe_search` has an explicit `rowid INTEGER PRIMARY KEY`.** The FTS5
  index is external-content and addresses rows by rowid; `VACUUM INTO`
  (our snapshot mechanism) may renumber implicit rowids, which would silently
  corrupt the index inside every backup. `rebuildAll` upserts rows in place
  and then issues the FTS `rebuild` command, so rowids never change.
- **Ranking vs sorting.** A query with text is bm25-ranked
  (title 10, tags 6, ingredients 5, description 3, steps 1); the user's sort
  applies to browsing without text. Unrated and untimed recipes sort last in
  both directions.
- **Tags** are unique `COLLATE NOCASE`; the first spelling wins, later
  spellings map to it. Tag rows are never removed (guard trigger); only
  `recipe_tags` links change.
- **Versioning rule.** A save creates a version only when the *normalized*
  `RecipeContent` differs from the current version's; whitespace, blank
  ingredient rows, and empty steps are not changes. Restore always creates a
  version, even one identical to the current.
- **Guard triggers** abort `DELETE` on every user-content table and `UPDATE`
  on versions, ingredients, instructions, ratings, and on a recipe's
  `parent_recipe_id`. `recipe_tags`, `recipe_search`, and `preferences` are
  the only rewritable tables (ADR-003).
- **Fixtures.** `kb-schema-v<N>.sqlite` is written once by
  `scripts/make-schema-fixture.sh` and never regenerated; each new migration
  adds a fixture for the version it starts from.

## Consequences

- Sorting and comparing dates in SQL is plain string comparison.
- Practical rounding's worst-case error is 1/8 (the ¾ → 1 gap in the PWA
  table), not the 1/16 the design first claimed; the property test and
  design.md now say 1/8. The table itself is an exact port and unchanged.
- Any future change to how `recipe_search` is derived bumps
  `SearchIndex.currentVersion`, which triggers a rebuild at next open.
