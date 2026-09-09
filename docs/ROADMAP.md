# Roadmap

**Status (2026-09-09):** every milestone M0–M9 is merged and tagged;
**v0.4.0 is the current TestFlight build.** Releases: v0.1.0 (build 43, M3),
v0.2.0 (51, M5), v0.3.0 (59, M8), v0.4.0 (M9). Open: 9.6 beta feedback
triage (tracked as M10, rolling), and the device checks listed under
"Human steps". First M10 items shipped 2026-09-09: dry ingredients convert
by weight (ADR-008); no product name but Kitchen Buddy in the UI; the index
buttons explained; a front-page filter chip bar with a Filters sheet. The recipe book
is feature-complete against the spec; what follows is feedback-driven.
**M11 (in progress, branch `m11/health`, ADR-009):** health profiles
(diabetes / blood pressure / heart health) estimated from a bundled food
table with an auditable per-line worksheet, plus "servings you actually
get" reports; ends with tag **v0.5.0**.

History: M0–M2 merged (PRs #5, #6, #7); TestFlight build
**0.1.0 (41)** verified on Andrew's phone: iCloud Drive available, daily
snapshot mirrored and visible in Files. Gate 2.6.1 closed. **M3 merged (PR #8) and tagged v0.1.0**: TestFlight
build **0.1.0 (43)** is the first usable recipe book — Library, Detail,
Editor, pickers, Archived, on top of the M2 safety net. M4 built on
`m4/settings-scaling-search`: the three Settings rows now drive the detail
screen (default servings, unit system, dietary suggestions), clear-rating,
the step-reorder fix, `#tag` / `in:Folder` shorthand and rating/time tokens
(merged, PR #9). M5 on `m5/versions-notes-folders`: Version History +
restore, Lineage, Notes with undo, rating history + haptics, Folder browser
(rename/move/delete/multi-select); 107 package tests + 8 XCUITests green.
Release step: tag **v0.2.0** on the merge. M6 on `m6/photos`: PhotoStore
(ImageIO ingest, thumbnails, soft removal + 30-day trash), Library
thumbnails, Detail header, gallery, viewer; P26 + memory test; gallery
XCUITest. M7 on `m7/url-import`: schema.org extraction (JSON-LD, @graph,
HowToSection, microdata), ingredient normaliser with P31 round trip, URL
importer with injectable fetch, Import-from-URL sheet + editor review mode +
Enter Manually, share-inbox drain, `kitchenbuddy://` links (merged, PR #12). M8 on
`m8/export-import-pdf`: v2 export document, Exporter (share/backup presets,
photos), Importer (preview, skip/copy, snapshot, one transaction), PDF
renderer, Share and Import Review sheets, Settings rows, Open In.
Release step: tag **v0.3.0** on the merge. M9 on `m9/polish`: Spotlight
indexing + continuation, quick actions, feedback link, TestFlight template,
signposts, 5,100-recipe perf seed, XXL accessibility pass. Release step:
tag **v0.4.0** on the merge. After that: beta feedback triage (9.6).

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9, v0.5.0 at M11.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | done, PR #5 |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | done, build 41 |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | done, build 43 |
| M4 Scaling, units, tags, search polish | | done |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | done, build 51 |
| M6 Photos | | done, build 55 |
| M7 URL import + Share Extension | | done, build 57 |
| M8 Export / import / PDF → **v0.3.0** | | done, build 59 |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | done, tagged; 9.6 triage open |
| M10 Beta feedback (rolling) | densities, no Sous Chef, index explained, filter chips | shipping as it lands (build 67) |
| M11 Health profiles + actual servings → **v0.5.0** | food table, estimator, worksheet, badges/filters, serving reports, schema v3, export 2.1 | in progress |

## Human steps remaining (Andrew)

- After M3 ships: create ten recipes by hand on the phone, edit, reorder, search, archive and unarchive, at the largest text size. Report anything that loses data.
- After M8 ships: AirDrop a `.kbrecipes` between two phones, open a PDF from Files, export a full backup, then delete-and-reinstall (TestFlight only) and import the backup.
- After M7 ships: share five recipe pages from Safari (a big site, a paywall, a blog, a non-recipe page) and report what each did; import one by pasting a URL.
- Internal testers must accept the TestFlight invitation email (Admin role alone shows nothing); a stale link can be re-issued from the API (`betaTesterInvitations`).

## Open items

- Nothing that can store a recipe ships before M2 (data safety) is complete.

## Standing constraints

- No dead controls: a setting or menu item ships with its consumer, and every
  milestone ends with a control walk before its tag (tasks.md, CLAUDE.md).
  Build 43 has three Settings rows (Units, default servings, dietary
  suggestions) that 4.1–4.3 make real; that is M4's first job.

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4). Data-safety features ship before data-entry features, always.
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
