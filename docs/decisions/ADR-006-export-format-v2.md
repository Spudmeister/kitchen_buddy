# ADR-006: Export format v2 (`.kbrecipes`)

**Status:** Accepted (finalized 2026-09-08, M8)
**Date:** 2026-09-07

## Context

The PWA's export format (`version: "1.0"` core / `"1.0.0"` PWA) carried only
the current version of each recipe: no version history, notes, rating history,
or folders. Kitchen Buddy must round-trip everything (property P22) and still
read the old files (P23).

## Proposal

- File extension `.kbrecipes`, UTType `net.puddleglum.kitchenbuddy.recipes`
  (conforms to `public.json`).
- Envelope `{ format: "kitchenbuddy-export", version: "2.0", exportedAt,
  appBuild, folders[], recipes[] }`; each recipe carries id, currentVersion,
  folderId, parentRecipeId, archivedAt, timestamps, tags, **versions[]** (each
  with ingredients and steps), ratings[], notes[], photos[] (base64 optional).
- Ingredient quantities are written twice: `quantity` (double, for other
  tools) and `quantityFraction` ("1/3"); readers prefer the fraction.
- A `LegacyV1Reader` lifts v1 files into the v2 shape in memory.

## Final shape (M8)

- Records: `folders[]` (id, name, parentId, timestamps, deletedAt) and
  `recipes[]` (id, currentVersion, folderId, parentRecipeId, archivedAt,
  timestamps, tags, versions[], ratings[], ratingClears[], notes[],
  photos[]). Versions carry ingredients (`quantity` + `quantityFraction`,
  unit and category raw values) and instructions; photos carry dimensions,
  caption, order and optional base64 `data`.
- Presets: *share* = current version only, no notes/ratings/history,
  a single recipe drops its folder; *backup* = everything including archived
  recipes and soft-deleted folders. Photos optional in both.
- Import: skip-existing keeps ids (a restore of a backup reproduces the
  rows); copy-as-new remaps every id; folders match by id and are created
  parents-first; a missing parent recipe clears the link; snapshot before,
  one transaction, orphaned photo files removed on rollback.
- v1 (`"1.0"` / `"1.0.0"` envelopes, arrays, the fixture dictionary) is
  lifted to v2 with fresh ids and one version per recipe.

## 2.1 (M11, 2026-09-09, ADR-009)

- Recipes gain `servingReports[]` (id, servings or null for "back to the
  recipe's", note, reportedAt) and `foodOverrides[]` (id, ingredientKey,
  foodId — null for "don't count", "" for "back to automatic" — createdAt),
  both oldest first and only in the backup preset (they are personal).
- The reader defaults both arrays to empty, so 2.0 files decode; any
  `"2."` version is accepted. An override naming a food this build's table
  doesn't know imports as "automatic" rather than miscounting.

## Consequences

- Committed sample files for every format version decode forever (iron rule 5).
- `.kbrecipes` is the App's exported UTType (`net.puddleglum.kitchenbuddy.recipes`, conforms to JSON); `.json` opens too.
