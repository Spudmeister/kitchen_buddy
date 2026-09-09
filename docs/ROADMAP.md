# Roadmap

**Status (2026-09-08):** M0–M2 merged (PRs #5, #6, #7); TestFlight build
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
Enter Manually, share-inbox drain, `kitchenbuddy://` links.

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | done, PR #5 |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | done, build 41 |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | done, build 43 |
| M4 Scaling, units, tags, search polish | | done |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | done, tag on merge |
| M6 Photos | | done |
| M7 URL import + Share Extension | | done |
| M8 Export / import / PDF → **v0.3.0** | | next |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## Human steps remaining (Andrew)

- After M3 ships: create ten recipes by hand on the phone, edit, reorder, search, archive and unarchive, at the largest text size. Report anything that loses data.
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
