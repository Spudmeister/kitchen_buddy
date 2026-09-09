# Design Document — Kitchen Buddy iOS

## Overview

Native SwiftUI iPhone app (iOS 17+). All logic lives in the SPM package
`KitchenBuddyKit`; `App/` is a thin XcodeGen shell plus a Share Extension.
Persistence is SQLite via GRDB 7 with FTS5. Data safety is designed in at the
storage layer (ADR-003). CI/CD is the cardplay pipeline (ADR-002, ADR-004).

## Architecture

| Target | Contents | May import |
|---|---|---|
| `KitchenCore` | `Fraction`, `IngredientUnit` (not `Unit`: Foundation exports one), `IngredientCategory`, `DietaryTag`, `Recipe`, `RecipeVersion`, `Ingredient`, `Instruction`, `Tag`, `Folder`, `Photo`, `Rating`, `RecipeNote`, `Preferences`, `RecipeDraft`, `RecipeQuery`, `RecipeSummary`, `RecipeDetail`, `RecipeHeritage`; `Scaler`, `UnitConverter`, `PracticalRounding`, `QuantityParser`, `TagDetector`, `SchemaOrgExtractor`, `IngredientNormalizer`, `ExportDocumentV2`, `LegacyV1Reader` | Foundation |
| `KitchenPersistence` | `DatabaseStack`, `RecipeBook` (facade: opens the database, owns the stores), `Migrations`, `SearchIndex`, `RecipeStore`, `FolderStore`, `TagStore`, `PreferencesStore`, `PhotoStore`, `BackupManager`, `CloudMirror`, `RecipeURLImporter`, `Exporter`, `Importer` | KitchenCore, GRDB (only here) |
| `KitchenUI` | `Router`/`Route`, screens, `@MainActor @Observable` view models, `PDFRenderer`, `SpotlightIndexer` | KitchenCore, KitchenPersistence, SwiftUI |
| `KitchenTesting` | `Gen`, `SeededRandomSource`, `RecipeGen`, temp-DB helpers | KitchenCore, KitchenPersistence |
| App `KitchenBuddy` | composition root, launch args, `.onOpenURL`, share inbox drain | KitchenUI, KitchenPersistence |
| `KitchenBuddyShare` | queue URL into App Group defaults (ADR-005) | Foundation, UIKit |

Stores expose protocols (`RecipeStoring`, `FolderStoring`, …) and
`AsyncSequence` observations (GRDB `ValueObservation`); view models depend on
protocols, never on GRDB. Concurrency: Swift 5 mode, strict concurrency
minimal, types Sendable-clean.

## Domain model

- IDs: `Tagged<T>` UUID-string wrapper, Codable as a bare string.
- **Quantity = `Fraction`** (exact rational). JSON writes `quantity` (double)
  and `quantityFraction` ("1/3"); readers prefer the fraction, else
  `Fraction(approximating:maxDenominator: 64)` (v1's 0.333 → 1/3). Unit
  conversion goes through Double and re-rationalizes (max denominator 1000)
  before practical rounding.
- `IngredientUnit`: tsp, tbsp, cup, fl_oz, pint, quart, gallon | ml, l | oz, lb | g, kg
  | piece, dozen | pinch, dash, to_taste; `category` volume/weight/count/other,
  `system` us/metric/nil. Ingredient quantity and unit are both optional
  ("salt", "pepper to taste").
- Drafts vs rows: `RecipeDraft { content: RecipeContent, tags, folderID }` is what
  the editor and importers hand to the store; `RecipeContent` holds the
  versioned fields (`IngredientDraft`/`InstructionDraft`, no ids). Stored rows
  (`Ingredient`, `Instruction`) get fresh ids per version. Saving compares
  normalized content to decide whether a version is created.
- Timestamps are ISO-8601 UTC text with milliseconds (`Timestamp`), normalized
  at the store boundary so returned values equal fetched ones (ADR-007).
- `RecipeVersion` is immutable; `Recipe` points at `currentVersion`.
- `RecipeNote {id, recipeID, body, cookedOn, pinned, versionAtCreation, createdAt, updatedAt, deletedAt}`.
- `Rating` rows are append-only; clearing a rating appends a `rating_clears`
  event (schema v2, M4); current = the latest event across both tables, or
  none when that event is a clear.
- Display pipeline: `Scaler.scale` (exact) → `UnitConverter.convert(to:)` →
  `PracticalRounding.round` → `QuantityFormatter`. `UnitConverter` first tries
  `IngredientDensity` (grams per US cup by ingredient keyword, longest match):
  US volume → metric weight and metric weight → US volume for dry/semi-solid
  ingredients; otherwise within-category conversion (ADR-008).

### PracticalRounding (exact port of the PWA algorithm)
`q < 1/8` → round to 2 dp · piece/dozen → nearest ½ · pinch/dash/to_taste →
whole · **ml/g at ≥ 1 → whole (added in M4: the port printed "236⅔ ml")** ·
otherwise fractional part `< 1/16` → floor, else nearest of
{1/8, 1/4, 1/3, 1/2, 2/3, 3/4, 1}, ties → smaller.

### UnitConverter tables
ml: tsp 4.92892, tbsp 14.7868, fl_oz 29.5735, cup 236.588, pint 473.176,
quart 946.353, gallon 3785.41, l 1000. g: oz 28.3495, lb 453.592, kg 1000.
Best unit: US volume <14.7868 ml tsp, <59.1471 tbsp, <946.353 cup, <3785.41
quart, else gallon; metric <1000 ml else l; US weight <453.592 g oz else lb;
metric <1000 g else kg.

## Schema (migration `v1-initial`)

Tables: `folders`, `recipes`, `recipe_versions` (UNIQUE recipe_id+version,
`restored_from_version`), `ingredients` (`quantity_num`, `quantity_den`,
generated `quantity_value`), `instructions`, `tags` (name UNIQUE NOCASE),
`recipe_tags`, `photos`, `ratings` (CHECK 1..5), `recipe_notes`, `preferences`,
`recipe_search` (denormalized projection: title, title_sort, description,
ingredients_text, instructions_text, tags_text, folder_id, archived_at,
latest_rating, total_minutes, thumbnail_photo_id, timestamps), and
`recipes_fts` = FTS5 external-content over `recipe_search`
(`tokenize='unicode61 remove_diacritics 2'`, `prefix='2 3'`) with AI/AD/AU
sync triggers. `recipe_search` has an explicit `rowid INTEGER PRIMARY KEY` so
`VACUUM INTO` snapshots cannot renumber the rows the FTS index points at;
`rebuildAll` upserts in place and then runs the FTS `rebuild` command.

Guard triggers: `BEFORE DELETE` → `RAISE(ABORT)` on recipes, recipe_versions,
ingredients, instructions, recipe_notes, photos, ratings, folders, tags;
`BEFORE UPDATE` → `RAISE(ABORT)` on recipe_versions, ingredients, instructions.

Search: `FTS5Pattern(matchingAllPrefixesIn:)` for safe query building;
`bm25(recipes_fts, 10, 3, 5, 1, 6)` ranking whenever the query has text (the
sort applies to browsing only); tag filters via `EXISTS` on `recipe_tags`;
unrated/untimed rows sort last in either direction; `LIMIT 500`; browse
without text reads `recipe_search` alone.
`SearchIndex.refresh(recipeID, db)` runs inside every write transaction;
`rebuildAll` when `preferences.search_index_version` is stale.

## Data safety

See ADR-003 for the full design: Application Support location included in
backups, WAL + `synchronous = FULL`, `BackupManager` (`VACUUM INTO`,
verification, retention), launch `quick_check` + rename-aside recovery,
`CloudMirror` to the visible iCloud Drive container, photo trash with 30-day
purge, never-erase migrator, per-version fixture databases.

## Navigation and screens

Single `NavigationStack` rooted at Library with a typed `Route` enum
(`recipe`, `recipeVersion`, `folder`, `history`, `lineage`, `notes`, `photos`,
`archived`, `settings`, `backups`) and a `Router.presented` sheet enum
(`editor`, `importURL`, `importFile`, `importReview`, `tagPicker`,
`moveToFolder`, `photoViewer`, `share`, `noteEditor`, `recovery`). Spotlight,
the share inbox, `.kbrecipes` Open In, and quick actions resolve to a Route.

| Screen | Native components and behaviour |
|---|---|
| Library | `List`; sections by top-level folder (toggle) or flat bm25-ranked when searching; `.searchable` with tokens (tag, folder, rating, max time, archived) and `#tag` / `in:Folder` shorthand; Sort menu; `+` menu (New, Import URL, Import File, New Folder); swipe Archive/Move; context menu; count pill; two empty states |
| Folder browser | Folders + Recipes sections, subtree counts, scoped search, rename/move/delete (contents move to parent), multi-select |
| Recipe Detail | `ScrollView`/`LazyVStack(pinnedViews:)`: paged photo header, title block, time chips + version badge, star row (tap sets, long-press history), tag chips, **pinned controls bar** (servings `Stepper`, factor + reset, Original/US/Metric picker), ingredients with tap-to-check, numbered steps, Notes, Lineage, footer; toolbar Edit + menu |
| Recipe Editor | `Form` in sheet, `.interactiveDismissDisabled(hasChanges)`; ingredients/steps with `.onMove`/`.onDelete`; quantity field with live rational validation; unit picker grouped; multi-line paste splitter; folder/tags/photos; import banner; dietary suggestion footer; Save gated by validation |
| Version History / Viewer | newest-first list with diff summary; viewer is Detail read-only with Restore… |
| Lineage | Ancestors / This recipe / Variations |
| Notes | pinned then newest-first; editor sheet; swipe pin/edit/delete with Undo |
| Photos | 3-column grid, Set as Cover / Caption / Remove; `PhotosPicker` + camera; full-screen paged viewer with pinch zoom |
| Import from URL | URL field + `PasteButton`; progress; success → editor review; failure reasons + Enter Manually |
| Export / Share | PDF or `.kbrecipes`; Share vs Backup preset; photos toggle with size; `ShareLink` over `Transferable` |
| Import from file | `fileImporter` + `.onOpenURL`; review sheet with counts, titles, Skip/Copy, destination folder; snapshot → transaction |
| Settings / Backups | preferences; Backups list with verification badges, Back Up Now, Restore…, Share snapshot; iCloud status; Damaged Databases (share only); Recovery full-screen cover at launch. Each preference row appears only once something reads it (tasks.md "No dead controls") |
| Archived, Tag Picker, Move to Folder | as named |

## Export format v2

See ADR-006. Envelope `{format: "kitchenbuddy-export", version: "2.0",
exportedAt, appBuild, folders[], recipes[]}`; recipes carry all versions,
tags, ratings, notes, photos (base64 optional), lineage, archive state.
`LegacyV1Reader` lifts `"1.0"`/`"1.0.0"` files.

## Correctness Properties

1. **Recipe round-trip** — create then fetch returns an equal recipe (all fields, exact rationals, order). *Req 1.1, 1.6*
2. **Version count** — N content edits → N+1 versions, earlier versions unchanged. *Req 2.1*
3. **No version spam** — tag/folder/photo/rating/note changes don't version. *Req 2.2*
4. **Restore creates, never mutates** — restore(k) adds a version equal to k with `restoredFromVersion = k`. *Req 2.5*
5. **Archive reversible and invisible** — rows kept; absent from default lists; unarchive restores everything. *Req 3.1–3.4*
6. **Monotonic non-destruction** — under any public-API sequence, counts of recipes/versions/ratings/notes never decrease; raw DELETE aborts. *Req 3.5, 17.1*
7. **Scaling exact** — every scaled quantity == q × t/b as a Fraction. *Req 8.1*
8. **Practical rounding** — result in the allowed set for the unit; error ≤ 1/8 (the table's widest gap is ¾ → 1; ≤ 1/4 for piece/dozen, ≤ 1/2 for pinch/dash/to taste). *Req 8.2*
9. **Conversion round-trip** — US→metric→US within 1%. *Req 9.5*
10. **Best-unit selection** — chosen unit is the largest whose threshold is met. *Req 9.2*
11. **Unit preference consistency** — all convertible ingredients display in the preferred system; others pass through. *Req 9.4*
12. **Tag association** — tag added ⇒ tag filter returns it; multi-tag filter is AND. *Req 5.1, 6.2*
13. **Dietary detection pure and gated** — deterministic; attached only after accept. *Req 5.3, 5.4*
14. **Word-prefix search coverage** — any word (≥2 chars) or prefix from title/description/ingredients/steps/tags finds the recipe; archived only with the token. *Req 6.1*
15. **Filter conjunction** — every result satisfies all active filters; none missing. *Req 6.2*
16. **Sort correctness** — ordered by key with stable title tiebreak. *Req 6.3*
17. **Rating append-only** — history chronological, unchanged; current = latest. *Req 15.1–15.3*
18. **Rating filter/sort** — results ≥ min; sort by current rating, unrated last. *Req 15.4*
19. **Lineage is a forest** — no self-parent, parent immutable, ancestor walk terminates, duplicate's v1 == source current. *Req 4.1–4.3*
20. **Folder tree acyclic** — moves into self/descendant rejected; ≤1 folder per recipe. *Req 16.1, 16.2*
21. **Folder export completeness** — exactly the non-archived subtree recipes. *Req 13.3*
22. **Export v2 round-trip** — export then import into an empty store yields an equal state (versions, notes, rating history, folders, lineage) up to id remapping. *Req 13.4, 14.4*
23. **v1 import acceptance** — every fixture v1 file imports with counts preserved. *Req 14.1*
24. **Import idempotence** — importing twice with skip-existing changes nothing. *Req 14.3*
25. **Notes journal** — pinned-first/newest-first; edits keep `createdAt`; deleted notes remain with `deletedAt`. *Req 7.1–7.5*
26. **Photos** — N supported images → N retrievable in order with dimensions/thumbnails; first is cover; removal soft. *Req 11.1–11.4*
27. **Snapshot verified** — passes `integrity_check`, recipe count ≥ live, recorded verified; opening yields the same recipe set. *Req 17.3*
28. **Restore round-trip and safety** — pre-restore snapshot taken; result equals S; failed restore leaves DB untouched. *Req 17.7*
29. **Corruption never destroys** — a DB failing `quick_check` is renamed aside, not modified; recovery passes `integrity_check`. *Req 17.5*
30. **Preference persistence** — survives reopen. *Req 18.3*
31. **URL parser** — every committed fixture parses to title + ≥1 ingredient + ≥1 step; `parse(format(line)) == line`. *Req 12.2, 12.6*
32. **Search index consistency** — incrementally maintained `recipe_search` rows equal rebuilt rows after any operation sequence. *Req 6.1*

## Testing Strategy

Swift Testing; property tests with `KitchenTesting.Gen` (seeded SplitMix64,
`@Test(arguments: 0..<250)`, seed in every failure message). One file per
property under `Tests/<Target>Tests/Properties/`. Safety suite under
`Tests/KitchenPersistenceTests/Safety/` (no-hard-delete trace test, snapshot,
retention with injected clock, recovery with fuzzed files, migration
fixtures, cloud mirror with a temp container). Performance test seeds 5,000
recipes and asserts search p95 < 50 ms on the Mac runner. XCUITest flow in
`App/UITests` plus a `--corrupt-db` launch that asserts the recovery notice.
