# ADR-006: Export format v2 (`.kbrecipes`)

**Status:** Proposed — finalized in M7
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

## Consequences

- Committed sample files for every format version decode forever (iron rule 5).
