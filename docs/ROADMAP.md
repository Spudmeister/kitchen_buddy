# Roadmap

**Status (2026-09-08):** M0–M2 merged (PRs #5, #6, #7); TestFlight build
**0.1.0 (41)** verified on Andrew's phone: iCloud Drive available, daily
snapshot mirrored and visible in Files. Gate 2.6.1 closed. M3 built on `m3/library-detail-editor`: Library
(search tokens, sort, folder sections, swipe/context actions, empty states),
Recipe Detail, Editor (reorder, fraction entry, validation, discard
confirmation), tag/folder pickers, Archived screen, scene restoration; 96
package tests + 4 XCUITests green; screenshots reviewed at default and
accessibility XXL sizes. Release step: tag **v0.1.0** on the merge.

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | done, PR #5 |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | done, build 41 |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | done, tag on merge |
| M4 Scaling, units, tags, search polish | | next |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | |
| M6 Photos | | |
| M7 URL import + Share Extension | | |
| M8 Export / import / PDF → **v0.3.0** | | |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## Human steps remaining (Andrew)

- After M3 ships: create ten recipes by hand on the phone, edit, reorder, search, archive and unarchive, at the largest text size. Report anything that loses data.
- Internal testers must accept the TestFlight invitation email (Admin role alone shows nothing); a stale link can be re-issued from the API (`betaTesterInvitations`).

## Open items

- Nothing that can store a recipe ships before M2 (data safety) is complete.

## Standing constraints

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4). Data-safety features ship before data-entry features, always.
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
