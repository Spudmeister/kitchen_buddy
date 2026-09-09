# Implementation Plan — Kitchen Buddy iOS

Tags: **v0.1.0 at M3** (first usable recipe book, already backed up), **v0.2.0 at M5**,
**v0.3.0 at M8**, **v0.4.0 at M9**. Data safety (M2) lands before any build that can hold a recipe. Every push to `main` uploads to TestFlight;
each milestone ends with a "What to test" note for the TestFlight build.

**No dead controls (rule added 2026-09-08 after build 43 shipped three Settings rows nothing read).** A setting, menu item, toolbar action, or token ships in the same task as the code that consumes it — never earlier as a placeholder. Every milestone's last task before the release/"What to test" step is a **control walk**: open every screen and confirm each control does something. Rows and menu items that belong to later milestones are listed under those milestones below, not under the screen that will host them.

## M0 — Bootstrap: repo migration, CI green, empty app on TestFlight

- [x] 0.1 Freeze the recipe fixtures as JSON; remove `src/`, `pwa/`, `tests/`, npm config, stale Claude commands; new `.gitignore`
- [x] 0.2 Scaffold `App/` (XcodeGen, `net.puddleglum.kitchenbuddy`, entitlements, document type, URL scheme, Share Extension stub, UITests) and `KitchenBuddyKit/` (four targets, GRDB 7, `Fraction`, `DatabaseStack`, `Gen`, smoke tests)
- [x] 0.3 `.github/workflows/release.yml` (test, build-app on PRs, testflight with CI cert import and tag-derived version, release)
- [x] 0.4 `CLAUDE.md`, `README.md`, `docs/ROADMAP.md`, ADR-001…006, this spec, `.claude/` hooks and settings
- [x] 0.5 Human setup (portal, ASC app record, `CI_CERT_*` then `ASC_*` secrets), merge, first TestFlight build uploaded (0.1.0 build 32)
- **What to test:** app installs, launches, shows the placeholder.

## M1 — Domain + persistence + tests

- [x] 1.1 KitchenCore types: `Tagged` IDs, `Unit`, `IngredientCategory`, `DietaryTag`, `Ingredient`, `Instruction`, `RecipeVersion`, `Recipe`, `Folder`, `Tag`, `Photo`, `Rating`, `RecipeNote`, `Preferences`, `RecipeDraft`, projections — _Req 1.1_
- [x] 1.2 `Scaler`, `PracticalRounding`, `QuantityParser` ("1 1/2", "¾", "0.75"), `QuantityFormatter` — _Req 1.3, 8.1, 8.2_
- [x] 1.3 `UnitConverter` (base factors, best-unit thresholds, pass-through units) — _Req 9.1, 9.2, 9.5_
- [x] 1.4 `TagDetector` ported from `tag-service.ts` keyword tables — _Req 5.2, 5.3_
- [x] 1.5 `Migrations.v1-initial` (schema, guard triggers, `recipe_search` + FTS5 + sync triggers, indexes), `SearchIndex` (refresh, rebuildAll, query builder), `RecipeStore`, `FolderStore`, `TagStore`, `PreferencesStore` — _Req 1.6, 2.1, 2.2, 2.5, 3.1, 3.2, 4.1, 4.2, 4.5, 6.1–6.3, 7.1–7.5, 15.1–15.3, 16.1, 16.2, 16.4, 17.1, 17.8, 18.3_
- [x] 1.6 `KitchenTesting`: `RecipeGen` (fractions, units, ingredients, versions, drafts, folder trees, edit sequences), temp-DB helper, v1 fixture loader
- [x] 1.7 Property tests P1–P8, P10–P20, P25, P30, P32; `NoHardDeleteTests`; `SearchPerformanceTests` (5,000 recipes) — _Req 6.5_
- [x] 1.8 `kb-schema-v1.sqlite` fixture + `MigrationFixtureTests`; `MigratorConfigTests`
- [x] 1.9 Demo seed (`--seed demo` imports `DemoRecipes.json` through the real importer path; Settings "Load sample recipes" in Debug/TestFlight)
  - [x] 1.9.1 Settings "Load sample recipes" button — landed with 2.4
- **Notes (2026-09-08):** `Unit` is named `IngredientUnit` (Foundation exports a `Unit` class); stores are reached through the `RecipeBook` facade (`RecipeBook.open(layout)`), the only public way to open the database; `LegacyV1Reader` landed here (not 8.1) because the demo seed needs it — 8.1 extends it; P9 is covered too. ADR-007 records the storage conventions.
- **What to test:** no user-visible change.

## M2 — Data safety: backups, iCloud, Settings (before any build can hold a recipe)

- [x] 2.1 `BackupManager`: `VACUUM INTO`, verification, retention, triggers (background/daily/migration/import/restore/manual) — _Req 17.2–17.4_
- [x] 2.2 Launch integrity check, damaged-file rename, Recovery screen, restore with pre-restore snapshot — _Req 17.5, 17.7_
- [x] 2.3 `CloudMirror`: iCloud Drive container copy of newest verified snapshot + photos, status, Restore from iCloud — _Req 17.6_
  - [x] 2.3.1 iCloud entitlements restored (2026-09-08); the App ID's iCloud capability had to be in Xcode 6 mode ("Include CloudKit support" ticked) — fixed via the API, see ADR-004 "Portal capabilities"
- [x] 2.4 Settings and Backups screens; share damaged DB — _Req 18.1–18.4_ (includes 1.9.1 "Load sample recipes"; Archived / Import / Export / Spotlight rows arrive with their milestones). **Mistake:** this also shipped the Units, default-servings, and dietary-suggestions rows before 4.1–4.3 read them — see the "No dead controls" rule; 4.0–4.3 make them real.
- [x] 2.5 P6 (full operation sequences), P27–P29 with fuzzed corrupt fixtures; retention test over 60 simulated days
- [x] 2.6 Gate: no build reaches TestFlight with a recipe editor until 2.1–2.5 are done and the iCloud container is assigned
  - [x] 2.6.1 Andrew: on a device signed into iCloud, Settings › Backups must show "iCloud Drive: Available" and a copied snapshot must appear in Files › iCloud Drive › Kitchen Buddy › Backups. Verified 2026-09-08 that the simulator cannot do this even when signed in: its `bird` daemon answers `BRCloudDocsErrorDomain 153 "iCloud Drive not supported"`, so `url(forUbiquityContainerIdentifier:)` is nil there by design — the app correctly shows "Unavailable". Device only. Closed 2026-09-08 on build 41: Andrew's phone showed "iCloud Drive: Available", "Last copied to iCloud 3 seconds ago", and Files › iCloud Drive › Kitchen Buddy › Backups holding the daily snapshot.
- **Notes (2026-09-08):** stores reach the database through a swappable `DatabaseHandle` so restore can close, swap, and reopen the file under them; weekly retention anchors use fixed epoch-aligned weeks (sliding windows dropped a week — caught by the 60-day simulation); verifying an existing snapshot checks integrity only, the recipe-count-vs-live rule guards fresh snapshots; `AppEnvironment` (3.1) landed here because Settings needed it. ADR-003 addendum records the mechanics.
- **What to test:** Settings › Backups shows verified snapshots after use; iCloud on → file visible in Files › iCloud Drive › Kitchen Buddy; restore a snapshot and verify counts.

## M3 — Library + Detail + Editor (usable recipe book) → tag `v0.1.0`

- [x] 3.1 `Router`, `Route`, `AppEnvironment`, app wiring, `@SceneStorage` path
- [x] 3.2 Library screen (list, rows, `.searchable` tokens, sort menu, folder sections, swipe/context actions, empty states) — _Req 6.1–6.4, 6.6, 3.2_
- [x] 3.3 Recipe Detail (header, meta, tags, ingredients tap-to-check, steps, version badge, toolbar menu) — _Req 10.1–10.4, 3.1_
- [x] 3.4 Recipe Editor (form, reorder, fraction entry, validation, discard confirmation, version-on-content-change) — _Req 1.1–1.6, 2.1, 2.2_
- [x] 3.5 Tag Picker and Move-to-Folder sheets; folder picker in editor — _Req 5.1, 5.5, 16.1_
- [x] 3.6 Archived screen and archived-mode Detail — _Req 3.2–3.4_
- [x] 3.7 Dynamic Type + VoiceOver baseline; XCUITest create → edit → search → archive → unarchive — _Req 19.1, 19.2_
- **Notes (2026-09-08):** rating stars are tappable already (store existed; haptics + history come with 5.4); a minimal folder screen (subfolders + scoped list) ships here, the full browser is 5.5; search tokens cover tags, folders, include-archived (rating/time tokens and `#tag`/`in:` shorthand are 4.4/4.5); on iOS 26 secondary toolbar items collapse into the system "More" overflow, so detail actions are flat items, not a nested menu; the ingredient editor row stacks at accessibility sizes (checked with `-UIPreferredContentSizeCategoryName` screenshots).
- [x] 3.8 Release: tag `v0.1.0` (2026-09-08, build 43, PR #8)
- **What to test:** create 10 recipes by hand, edit, reorder ingredients, search, sort, archive/unarchive, largest text size. Report anything that loses data.

## M4 — Make the shipped settings real, then scaling/units/tags/search polish

Order matters: 4.0–4.3 first, so the next TestFlight build has no dead Settings row.

- [ ] 4.0 Editor bug: press-and-hold reorder of a step scrolls the form to the top (reported on build 43). Iterate rows by stable id, reorder only in edit mode via handles, resign focus when edit mode starts; XCUITest drags step 3 above step 1 and asserts order + scroll position — _Req 1.2_
- [ ] 4.1 Servings stepper with live scaling, factor label, reset, long-press numeric entry; **consumes Settings › default servings** (18.2) — _Req 8.1–8.5_
- [ ] 4.2 Original / US / Metric control on Detail with best-unit display; **consumes Settings › Units** (9.3); per-screen change does not write the preference — _Req 9.3, 9.4_
- [ ] 4.3 Dietary suggestions footer in the editor with accept flow; **consumes Settings › Suggest dietary tags** — _Req 5.3, 5.4_
- [ ] 4.4 Search: bm25 weights, prefix matching, `#tag` / `in:folder` shorthand, suggested tokens, include-archived token — _Req 6.1, 6.2_
- [ ] 4.5 Rating and time search tokens; count footer — _Req 6.2_
- [ ] 4.6 P9, P11, P13, P14 at view-model level; `QuantityFormatter` table snapshot test
- [ ] 4.7 Control walk: every Settings row, Library token, Detail control, and Editor control does something in this build
- **What to test:** set Units to Metric and a default of 6 servings in Settings, open any recipe: it opens at 6 servings in metric. Scale to 1, 3, 7 and check fractions look like a cookbook. Add "butter" to a recipe with dietary suggestions on and see "vegetarian" offered, off and see nothing. Try `#vegetarian` and `in:Desserts`. Reorder steps by drag.

## M5 — Versions, lineage, notes, ratings, folders → tag `v0.2.0`

- [ ] 5.1 Version History + Viewer + restore; **adds the "Version History" item to the Detail overflow here** (10.3) — _Req 2.3–2.5_
- [ ] 5.2 Duplicate + Lineage screen + lineage section — _Req 4.1–4.4_
- [ ] 5.3 Notes section, Notes screen, Note Editor, pin, soft delete with undo — _Req 7.1–7.5_
- [ ] 5.4 Ratings: star control with haptics, history, Library filter/sort — _Req 15.1–15.5_
- [ ] 5.5 Folder browser: nested, create/rename/move/delete, multi-select move, counts — _Req 16.1–16.6, 18.1_
- [ ] 5.6 P2–P4, P17–P20, P25 end-to-end; UI tests for restore and folder cycle rejection
- [ ] 5.7 Control walk (every new menu item, sheet, and Settings row reads or writes something)
- [ ] 5.8 Release: tag `v0.2.0`
- **What to test:** edit a recipe three times, restore v1, confirm v4 appears; duplicate and follow lineage; nest folders three deep and try to move a folder into its own child.

## M6 — Photos

- [ ] 6.1 `PhotoStore`: ingest (downsample, JPEG, thumbnail, EXIF), file layout, soft remove, trash purge — _Req 11.1, 11.2, 11.4_
- [ ] 6.2 `PhotosPicker` + camera wrapper; Add Photo from Detail and Editor — _Req 11.1_
- [ ] 6.3 Photo header, cover thumbnails in Library, gallery with Set as Cover / caption — _Req 11.3_
- [ ] 6.4 Full-screen viewer with paging and pinch zoom — _Req 11.5_
- [ ] 6.5 P26; 50-photo memory test
- [ ] 6.6 Control walk (Add Photo entry points, gallery actions, viewer)
- **What to test:** add HEIC photos from camera and library, set cover, zoom, check Library thumbnails and storage growth.

## M7 — URL import + Share Extension

- [ ] 7.1 `SchemaOrgExtractor` (JSON-LD incl. `@graph`, arrays, `HowToSection`; microdata fallback), ISO-8601 durations, yield parsing — _Req 12.1, 12.2_
- [ ] 7.2 `IngredientNormalizer` (unit aliases, fractions, category keywords) and multi-line paste splitter — _Req 12.2, 1.3_
- [ ] 7.3 Import-from-URL sheet (`PasteButton`, progress, failure states, manual-entry fallback); Editor review mode; **adds "Import from URL" to the Library `+` menu here** — _Req 12.3, 12.4_
- [ ] 7.4 Share Extension queue drain (`InboxWatcher`), `kitchenbuddy://import?url=` — _Req 12.5, 19.4_
- [ ] 7.5 P31 over hand-written fixtures (JSON-LD, `@graph`, microdata); `scripts/fetch-url-fixtures.sh` for live checks
- [ ] 7.6 Control walk (Share Extension, `+` menu, URL scheme)
- **What to test:** share five recipe pages from Safari (a big site, a paywall, a blog, a non-recipe page) and report what each did; import one by pasting.

## M8 — Export / import / PDF → tag `v0.3.0`

- [ ] 8.1 `ExportDocumentV2` + `LegacyV1Reader` + ADR-006 finalized — _Req 13.4, 14.1_
- [ ] 8.2 `Exporter` scopes/presets, photo embedding, `Transferable` file; Share screen; **adds "Share" to the Detail overflow (10.3) and "Export full backup" to Settings (18.4) here** — _Req 13.1, 13.3, 13.5_
- [ ] 8.3 `PDFRenderer` (ImageRenderer + paginated CGContext PDF) — _Req 13.2_
- [ ] 8.4 `.kbrecipes` handling: `fileImporter`, `.onOpenURL`, Import Review sheet, skip/copy policy, pre-import snapshot; **adds "Import from file" to Settings (18.4) and "Import File" to the Library `+` menu here** — _Req 14.1–14.5, 19.4_
- [ ] 8.5 P21–P24; PDF golden test (page count, text extraction)
- [ ] 8.6 Control walk (Settings import/export rows, Share screen, `.kbrecipes` Open In)
- [ ] 8.7 Release: tag `v0.3.0`
- **What to test:** AirDrop a `.kbrecipes` between two phones, print a PDF from Files, export a full backup, delete-and-reinstall (TestFlight only), import the backup.

## M9 — Polish, accessibility, Spotlight, beta → tag `v0.4.0`

- [ ] 9.1 Spotlight indexing + continuation; **adds "Reindex Spotlight" to Settings (18.4) here** — _Req 19.3_
- [ ] 9.2 Accessibility audit (VoiceOver, largest text, Reduce Motion) on every screen — _Req 19.1, 19.2, 19.5_
- [ ] 9.3 Quick Actions ("New Recipe", "Import from Clipboard"); state restoration — _Req 19.4_
- [ ] 9.4 On-device performance pass with 5,000 seeded recipes; `os_signpost` around search and snapshot — _Req 6.5_
- [ ] 9.5 App icon, launch screen, TestFlight "What to Test" template, feedback link, screenshot script states
- [ ] 9.6 Beta feedback triage (one sub-task per accepted item)
- [ ] 9.7 Control walk of the whole app, at default and accessibility text sizes
- [ ] 9.8 Release: tag `v0.4.0`
- **What to test:** search from the iPhone home screen for a recipe title; VoiceOver for a full create flow; send feedback through the link.
