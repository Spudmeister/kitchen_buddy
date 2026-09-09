# Requirements Document — Kitchen Buddy iOS (recipe book MVP)

## Introduction

Kitchen Buddy is a native iPhone digital recipe book: local-first SQLite, no
accounts, no AI. This spec covers only the recipe book. Out of scope: cook
mode, cook sessions/timers/statistics, shopping lists, menus, meal prep,
substitutions, recommendations, the Sue assistant, and photo-to-recipe
import. Each requirement maps back to the original `sous-chef` (core) and
`sous-chef-pwa` (PWA) specs.

## Glossary

- **Recipe_Book**: store + services owning recipes, versions, tags, folders, notes, ratings, photos
- **Recipe_Editor**: the form for creating, editing, and reviewing imported recipes
- **Recipe_Parser**: URL import from schema.org data only (no AI)
- **Unit_Converter**: scaling, US/metric conversion, practical rounding
- **Tag_Engine**: tags and keyword-based dietary detection
- **Export_Service**: PDF and `.kbrecipes` (JSON v2) export/import
- **Photo_Manager**: photo storage and thumbnails
- **Snapshot_Manager**: verified database snapshots, integrity check, recovery
- **Cloud_Mirror**: iCloud Drive copy of the newest verified snapshot and photos
- **Food_Table**: the bundled, versioned table of common foods with USDA nutrients per 100 g, glycemic index with its source, unit weights and densities
- **Nutrition_Estimator**: pure function from a version's ingredients and an effective servings count to per-serving nutrients, one auditable line per ingredient
- **Health_Profile**: a named condition (diabetes, blood pressure, heart health) that bands one per-serving nutrient into low / medium / high

## Requirements

### Requirement 1: Recipe Creation and Editing
**User Story:** As a home cook, I want to create and edit recipes in a form, so that my collection is mine.
1. WHEN a user creates a recipe THEN the Recipe_Book SHALL store title, description, ingredients (name, quantity, unit, notes, category), numbered steps (text, optional minutes, notes), prep minutes, cook minutes, servings, and source URL.
2. THE Recipe_Editor SHALL allow adding, removing, and reordering ingredients and steps.
3. WHEN a quantity is entered as a fraction ("1 1/2", "¾", "0.75") THEN the Recipe_Editor SHALL accept it and store an exact rational value.
4. WHEN saving THEN the Recipe_Editor SHALL require a non-empty title, at least one named ingredient, and at least one non-empty step, and SHALL show which rule fails.
5. WHEN a user dismisses an editor with unsaved changes THEN the Recipe_Editor SHALL ask for confirmation before discarding.
6. WHEN a recipe is saved THEN the Recipe_Book SHALL persist the change immediately.
*Maps to: core 1.1, 1.12, 9.5; PWA 20.2–20.5.*

### Requirement 2: Versions and Restore
1. WHEN versioned content (title, description, times, servings, source URL, ingredients, steps) changes on save THEN the Recipe_Book SHALL create a new immutable version and preserve all prior versions.
2. WHEN only non-versioned attributes change (tags, folder, photos, rating, notes) THEN the Recipe_Book SHALL NOT create a new version.
3. WHEN viewing a recipe THEN the UI SHALL show the current version number and date.
4. WHEN a user opens Version History THEN the UI SHALL list all versions newest-first with timestamps and allow viewing any version read-only.
5. WHEN a user restores a version THEN the Recipe_Book SHALL create a new version with that version's content, recording `restoredFromVersion`, and SHALL NOT delete or alter any version.
*Maps to: core 1.2, 1.3; PWA 20.6, 22.1–22.4.*

### Requirement 3: Archive (Soft Delete)
1. WHEN a user deletes a recipe THEN the Recipe_Book SHALL set `archivedAt` and SHALL NOT remove any row or file.
2. THE Library, search, folders, and Spotlight SHALL exclude archived recipes by default.
3. THE Archived screen SHALL list archived recipes and allow viewing and unarchiving.
4. WHEN a recipe is unarchived THEN it SHALL reappear in its previous folder with all versions, notes, ratings, and photos intact.
5. THE Recipe_Book SHALL NOT expose any permanent-delete action for recipes, versions, notes, or ratings.
*Maps to: core 1.4; PWA 23.4.*

### Requirement 4: Duplicate and Lineage
1. WHEN a user duplicates a recipe THEN the Recipe_Book SHALL create a new recipe (version 1 = current version content, tags copied, photos not copied, same folder) with `parentRecipeID` set to the source.
2. THE `parentRecipeID` SHALL be set only at creation, SHALL never equal the recipe's own id, and SHALL never change afterwards.
3. WHEN viewing a recipe with a parent THEN the UI SHALL show the parent and the full ancestor chain to the root.
4. WHEN viewing a recipe with derived copies THEN the UI SHALL list the children, marking archived ones.
5. WHEN importing recipes whose parent is not present THEN the Recipe_Book SHALL keep the recipe and clear the dangling link.
*Maps to: core 1.10, 1.11; PWA 23.1–23.3.*

### Requirement 5: Tags and Dietary Detection
1. WHEN a user adds or removes tags THEN the Tag_Engine SHALL associate them with the recipe; tag names are case-insensitive and trimmed.
2. THE Tag_Engine SHALL provide built-in dietary tags: vegan, vegetarian, gluten-free, dairy-free, nut-free, low-carb.
3. WHEN a recipe is saved THEN the Tag_Engine SHALL compute keyword-based dietary suggestions from ingredient names (no network, no AI).
4. WHEN suggestions exist THEN the UI SHALL present them for confirmation and SHALL NOT apply them without user acceptance.
5. THE tag picker SHALL offer existing tags as suggestions while typing.
*Maps to: core 3.1, 3.3, 3.7, 3.8.*

### Requirement 6: Search, Browse, Sort, Filter
1. WHEN a user types in search THEN the Recipe_Book SHALL return matches across title, description, ingredient names, step text, and tags (word-prefix, diacritic-insensitive) using the FTS5 index, updating as the user types.
2. THE Library SHALL support filters: tags (AND), minimum rating, maximum total time, folder (including subfolders), and an include-archived switch.
3. THE Library SHALL support sorts: name, rating, date added, date updated, total time; each with a direction.
4. THE Library SHALL show per row: cover thumbnail, title, total time, rating, up to three tags.
5. THE Recipe_Book SHALL keep search results under 100 ms for 5,000 recipes on an iPhone 12-class device.
6. WHEN no recipes match THEN the Library SHALL distinguish "no recipes yet" from "no matches" and offer to clear filters or add a recipe.
7. THE Library SHALL show its filters on the front page as tappable chips (time limits, minimum rating, the most-used tags, a Filters sheet with a time slider and every tag, sort) so a combination like "dinner under 45 minutes" takes two taps without opening search. *(Added 2026-09-09 from beta feedback.)*
*Maps to: core 3.4, 3.5, 3.6, 9.2; PWA 3.1–3.7.*

### Requirement 7: Cooking Notes
**User Story:** As a home cook, I want a running journal per recipe, so that I remember what I changed and how it went.
1. WHEN a user adds a note THEN the Recipe_Book SHALL store free text with a cooked-on date and the recipe version current at that time.
2. THE UI SHALL list notes pinned-first then newest-first on the recipe and in a dedicated Notes screen.
3. WHEN a user edits a note THEN the Recipe_Book SHALL update its body and `updatedAt`; notes are not versioned.
4. WHEN a user pins a note THEN it SHALL appear first in the recipe's Notes section.
5. WHEN a user deletes a note THEN the Recipe_Book SHALL set `deletedAt` (soft delete), hide it, and offer Undo.
6. THE notes SHALL be included in exports and backups.
*Maps to: new (replaces the notes part of core 18.2).*

### Requirement 8: Scaling
1. WHEN a user changes servings on the detail screen THEN the Unit_Converter SHALL scale every ingredient quantity by `newServings / baseServings` exactly (rational arithmetic).
2. THE UI SHALL display quantities rounded to practical measures: fractions from {1/8, 1/4, 1/3, 1/2, 2/3, 3/4}, whole numbers for pinch/dash/to-taste, halves for piece/dozen, two decimals below 1/8.
3. THE UI SHALL show the scale factor and provide a one-tap reset to the base servings.
4. WHEN a recipe has no servings value THEN scaling SHALL be disabled with an explanation.
5. Scaling SHALL be display state; it SHALL NOT modify the stored recipe or create a version.
*Maps to: core 2.1, 2.4; PWA 14.1, 14.2, 14.4.*

### Requirement 9: Unit Conversion and Default System
1. THE Unit_Converter SHALL convert between US and metric volume and weight units using fixed factors; count and descriptive units (piece, dozen, pinch, dash, to taste) SHALL pass through unchanged.
6. WHEN an ingredient has a known density (flour, sugar, butter, oats, cocoa, salt and the other common dry or semi-solid ingredients) THEN converting a US volume to metric SHALL give a weight (1 cup flour → 125 g) and converting a metric weight to US SHALL give a volume (250 g flour → 2 cups); liquids and unknown ingredients SHALL convert within their own category. *(Added 2026-09-09 from beta feedback.)*
2. WHEN converting THEN the Unit_Converter SHALL choose the best unit by magnitude (1,200 ml → 1.2 l; 48 tsp → 1 cup).
3. THE detail screen SHALL offer Original / US / Metric; the default SHALL come from Preferences; a per-screen change SHALL NOT change the preference.
4. WHEN the preference is US or Metric THEN every recipe SHALL display in that system; when Original, as written.
5. Converting US → metric → US SHALL return within 1% of the original quantity.
*Maps to: core 2.2, 2.3, 2.5, 10.1; PWA 14.3, 14.5.*

### Requirement 10: Recipe Display
1. WHEN viewing a recipe THEN the UI SHALL show photos, title, description, prep/cook/total time, servings control, unit control, rating, tags, folder, version badge, ingredients, numbered steps, notes, lineage, and source link.
2. WHEN a user taps an ingredient THEN the UI SHALL toggle a checked (strikethrough) state for the current view; the state SHALL clear when leaving the recipe.
3. THE detail screen SHALL provide actions: Edit, Duplicate, Move to Folder, Share, Version History, Archive.
4. THE detail screen SHALL honour Dynamic Type through accessibility sizes without truncating ingredients or steps.
*Maps to: PWA 13.1–13.3, 13.5.*

### Requirement 11: Photos
1. WHEN a user adds photos THEN the Photo_Manager SHALL accept multiple photos per recipe from the photo library or camera, in JPEG, PNG, HEIC, or HEIF.
2. WHEN a photo is stored THEN the Photo_Manager SHALL save a copy no larger than 2048 px on the long edge plus a thumbnail, with width, height, taken-at (from EXIF when present), and an optional caption.
3. THE first photo in sort order SHALL be the cover shown in Library rows and the detail header; the user SHALL be able to change it.
4. WHEN a user removes a photo THEN the Photo_Manager SHALL mark it removed (soft) and keep the file for at least 30 days.
5. THE full-screen viewer SHALL support swiping between photos and pinch zoom.
6. Photos SHALL be included in exports when the user opts in and always in backups.
*Maps to: core 17.1, 17.4, 17.6; PWA 18.2, 18.4.*

### Requirement 12: Import from URL and Share Extension
1. WHEN a user pastes or shares a URL THEN the Recipe_Parser SHALL fetch the page and extract a recipe from schema.org JSON-LD, then microdata; no AI or third-party services.
2. THE Recipe_Parser SHALL normalise ingredient lines into quantity, unit, name, notes, and category, and SHALL parse ISO-8601 durations and yield strings.
3. WHEN extraction succeeds THEN the UI SHALL open the Recipe_Editor prefilled for review and SHALL NOT save until the user taps Save.
4. IF extraction fails THEN the UI SHALL explain why (no recipe data, network error, blocked page) and offer manual entry with the URL prefilled as source.
5. THE Share Extension SHALL accept a web URL from Safari and other apps, queue it for the app, and the app SHALL open the review editor on next launch or foreground.
6. THE Recipe_Parser SHALL succeed on every committed HTML fixture.
*Maps to: core 1.5, 1.7, 1.8, 1.9; PWA 20.1, 21.1–21.3. Share Extension is new (ADR-005).*

### Requirement 13: Export and Share
1. WHEN a user shares a recipe THEN the Export_Service SHALL offer a PDF and a Kitchen Buddy file (`.kbrecipes`, JSON format v2) through the system share sheet.
2. THE PDF SHALL be a paginated Letter/A4 document with cover photo, title, times, servings, ingredients, steps, and source, reflecting the current scale and unit selection.
3. THE Export_Service SHALL export a single recipe, a folder (recursively), or a full backup of all recipes, folders, and photos.
4. THE JSON format v2 SHALL be documented in design.md and SHALL include versions, notes, rating history, tags, folders, lineage, and optionally base64 photos.
5. WHEN sharing (not backing up) THEN the user SHALL be able to exclude notes, ratings, and version history with one switch.
*Maps to: core 8.1, 8.2, 8.5, 9.3, 9.7, 9.8; PWA 24.5, 29.1–29.3.*

### Requirement 14: Import from File
1. WHEN a user opens a `.kbrecipes` or `.json` file (Files picker, AirDrop, Open In) THEN the Recipe_Book SHALL validate it as the Kitchen Buddy recipe format (v2, or the older v1 JSON shape). The UI SHALL present one format, "Kitchen Buddy recipes"; no other product name appears. *(Clarified 2026-09-09.)*
2. WHEN validation succeeds THEN the UI SHALL preview counts (recipes, folders, photos, versions, notes) and list recipe titles, flagging ids already present.
3. THE user SHALL choose to skip existing recipes (default) or import them as copies with new ids.
4. WHEN the user confirms THEN the Recipe_Book SHALL take a snapshot first, then import in a single transaction; on any error nothing SHALL be imported.
5. IF validation fails THEN the UI SHALL list the errors and import nothing.
*Maps to: core 8.3, 9.9; PWA 29.4, 29.5.*

### Requirement 15: Ratings with History
1. WHEN a user taps a star (1–5) THEN the Recipe_Book SHALL append a rating with timestamp and save immediately.
2. THE current rating SHALL be the most recent entry; the UI SHALL show it on rows and the detail screen.
3. THE UI SHALL show rating history (value, date) and SHALL never edit or remove past entries.
4. THE Library SHALL filter by minimum rating and sort by rating.
5. WHEN a rating is saved THEN the device SHALL give haptic feedback.
*Maps to: core 13.1, 13.2, 13.3, 13.5; PWA 25.1–25.4.*

### Requirement 16: Folders
1. THE Recipe_Book SHALL support nested folders; a recipe belongs to at most one folder or to Unfiled.
2. WHEN a user moves a folder THEN the Recipe_Book SHALL reject a move into itself or any descendant.
3. THE Folder browser SHALL show subfolders and recipes, with recipe counts including subfolders.
4. WHEN a user deletes a folder THEN its recipes and subfolders SHALL move to the parent (or Unfiled) and the folder row SHALL be soft-deleted.
5. WHEN a user renames a folder THEN existing recipes SHALL remain in it.
6. THE Library SHALL be able to section recipes by top-level folder.
*Maps to: core 9.7; PWA 24.1–24.4.*

### Requirement 17: Data Safety and Backup
**User Story:** As the owner of a lifetime of recipes, I want it to be effectively impossible to lose them.
1. THE Recipe_Book SHALL never hard-delete recipes, versions, notes, or ratings; the database SHALL enforce this with delete-abort triggers.
2. THE Snapshot_Manager SHALL create a snapshot of the database (SQLite `VACUUM INTO`) automatically: when the app goes to background with changes and at least one hour since the last snapshot, daily, before schema migration, before any import, before any restore, and on demand.
3. WHEN a snapshot is written THEN the Snapshot_Manager SHALL verify it by opening it read-only, running `PRAGMA integrity_check`, and confirming its recipe count is not lower than the live database's; only verified snapshots SHALL be listed as restore candidates or displace older ones.
4. THE Snapshot_Manager SHALL retain at least the last 7 automatic snapshots, weekly snapshots for 4 weeks, every pre-migration snapshot, and recent manual/pre-import/pre-restore snapshots, and SHALL never delete the only verified snapshot.
5. WHEN the app launches THEN it SHALL run `PRAGMA quick_check`; IF it fails THEN the app SHALL rename the damaged file (never delete), restore the newest verified snapshot, and show a non-dismissable notice offering to export the damaged file.
6. THE Cloud_Mirror SHALL copy the newest verified snapshot and new photos to the app's iCloud Drive container when iCloud is available, and Settings SHALL show the last successful copy time or the reason it is unavailable.
7. WHEN a user restores a snapshot THEN the current database SHALL be snapshotted first and the restore SHALL be atomic.
8. THE Recipe_Book SHALL run all writes in transactions with WAL journaling and full synchronous mode, foreign keys enabled.
*Maps to: core 9.1, 9.4, 9.5, 9.6; rest new (ADR-003).*

### Requirement 18: Preferences and Settings
1. THE Settings SHALL include: unit system (Original/US/Metric), default servings (off or a number), dietary suggestions on/off, group Library by folder on/off, iCloud backup on/off.
2. WHEN default servings is set THEN the detail screen SHALL open scaled to it when the recipe has a servings value.
3. WHEN a preference changes THEN the UI SHALL apply it immediately and persist it across launches.
4. THE Settings SHALL expose: Backups, iCloud status, Archived recipes, Import from file, Export full backup, Rebuild search index, Reindex Spotlight, About (version, build, format version).
*Maps to: core 10.1, 10.2, 10.4; PWA 28.1, 28.4–28.6.*

### Requirement 19: Accessibility and Platform Integration
1. ALL screens SHALL support Dynamic Type through the accessibility sizes and VoiceOver with meaningful labels, values, and hints for custom controls (rating, servings, ingredient check).
2. THE UI SHALL not convey state by colour alone and SHALL keep tap targets at least 44 pt.
3. WHEN a recipe is saved or unarchived THEN it SHALL be indexed in Spotlight; archived recipes SHALL be removed from the index; tapping a result SHALL open the recipe.
4. THE app SHALL register `.kbrecipes` as its document type, accept `.json` via Open In, and handle `kitchenbuddy://recipe/<id>` and `kitchenbuddy://import?url=` links.
5. THE app SHALL respect Reduce Motion.
*Maps to: PWA 30.1, 30.3–30.5; Spotlight/UTType new.*

### Requirement 20: Actual Servings (Serving Reports)
1. WHEN a user reports how many servings a recipe really makes for them ("this chili is 4 servings, not 8") THEN the Recipe_Book SHALL append a serving report (servings, optional note, timestamp) without creating a version or changing the recipe's stated yield.
2. THE effective servings of a recipe SHALL be the latest serving report's count, or the version's servings when there is no report or the latest report resets to the recipe's own count.
3. THE detail screen SHALL show both values when they differ ("Recipe says 8 · you get 4"), and the servings control, the default-servings preference (18.2) and every per-serving health figure (21) SHALL use the effective servings as their base.
4. Serving reports SHALL be append-only and never deleted; the history SHALL be visible from the servings sheet; the export file SHALL carry them (13.4).
*(Added 2026-09-09 from beta feedback: "my family loves chili and this recipe actually is just 4 servings".)*

### Requirement 21: Health Profiles (Diabetes, Blood Pressure, Heart Health)
1. THE app SHALL bundle a Food_Table: common foods with total carbohydrate, fibre, sodium and saturated fat per 100 g from USDA FoodData Central (public domain, FDC id kept per food), a glycemic index from the published International Tables of Glycemic Index values (source and basis kept per food, "proxy" when a close relative's value is used), a unit weight for countable foods, and a density for volume measures. The table SHALL be versioned and SHALL ship inside the app; no network is used.
2. THE Nutrition_Estimator SHALL map each ingredient line to a food by the longest keyword found in its name (or by the user's override for that recipe and ingredient name), turn its quantity into grams (weights directly; volumes through density; counts through unit weight), and compute total carbohydrate, available carbohydrate (total − fibre), glycemic load (GI × available carbohydrate ÷ 100), sodium and saturated fat per line, per recipe and per effective serving. It SHALL be deterministic and pure.
3. THE estimate SHALL be auditable: a worksheet SHALL show, for every ingredient line, the matched food and the keyword that matched it, the grams and how they were derived, the nutrient figures and the GI with its source; lines that were not counted SHALL be listed with the reason (no matching food, no quantity, a unit that cannot become grams, or "don't count" by the user).
4. WHEN fewer than 80% of the recipe's countable lines are counted THEN every profile SHALL show "Not enough data" rather than a band. Lines without a quantity or with pinch / dash / to taste are seasoning and never count against coverage.
5. THE Health_Profiles SHALL be: **Diabetes** on glycemic load per serving (low ≤ 10, medium 11–19, high ≥ 20, the published GL bands); **Blood pressure** on sodium per serving (low ≤ 140 mg, the FDA "low sodium" claim; medium ≤ 600 mg; high above); **Heart health** on saturated fat per serving (low ≤ 4 g, medium ≤ 8 g, high above; a third and two thirds of a 13 g daily limit). Each band SHALL have a colour, a word and a symbol, never colour alone (19.2).
6. THE Library row and the Recipe Detail SHALL show a badge per enabled profile; tapping the Detail badge SHALL open the worksheet; the worksheet SHALL let the user change a line's food (search the Food_Table) or mark it "don't count", stored as an append-only override for that recipe and ingredient name and applied immediately.
7. Settings SHALL have a Health section with one switch per profile (Diabetes on by default, the others off) and a Sources screen naming the data sources, the table version and food count, and the thresholds; every badge and the worksheet SHALL say the figures are estimates from typical ingredients, not medical advice.
8. THE Library SHALL offer a "<profile>-friendly" filter (band = low) as a chip and a search token for each enabled profile; results SHALL satisfy it exactly (6.2).
9. Per-serving figures and bands SHALL be kept in a derived table refreshed inside every write transaction and rebuilt when the Food_Table version, the thresholds or the derivation change (as the search index is), so the Library needs no per-row computation.
10. Food overrides SHALL travel in the export file (13.4) and SHALL survive versions: they key on the recipe and the normalized ingredient name, not the ingredient row id.
*(Added 2026-09-09 from beta feedback: "having diabetes (and maybe other common ailments) as first class … a transparent/auditable way that we calculate this … a simple color scale … considering portion size".)*

