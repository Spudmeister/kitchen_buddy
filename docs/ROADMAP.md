# Roadmap

**Status (2026-09-08):** M1 merged (PR #5). M2 built on branch
`m2/data-safety`: verified `VACUUM INTO` snapshots with retention, launch
`quick_check` + rename-aside recovery, atomic restore with a pre-restore
snapshot, iCloud Drive mirror, Settings and Backups screens, Recovery notice;
90 package tests + 3 XCUITests green (P27–P29 with fuzzed corruption, 60-day
retention simulation). Gate 2.6.1 needs a device check of the iCloud
container. Next: M3 (Library, Detail, Editor → v0.1.0).

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | done, PR #5 |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | done except device check 2.6.1 |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | next |
| M4 Scaling, units, tags, search polish | | |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | |
| M6 Photos | | |
| M7 URL import + Share Extension | | |
| M8 Export / import / PDF → **v0.3.0** | | |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## Human steps remaining (Andrew)

- **2.6.1** On the TestFlight build after M2 merges: open Settings › Backups on a phone signed into iCloud; confirm "iCloud Drive: Available", tap "Copy Newest Snapshot to iCloud", and find the file in Files › iCloud Drive › Kitchen Buddy › Backups. If it says unavailable on a signed-in phone, the container is not assigned to the App ID (ADR-004 "Portal capabilities"). The simulator always says unavailable — it has no iCloud Drive support (checked 2026-09-08 with a signed-in account).
- Try "Load Sample Recipes" in Settings, then Back Up Now, then Restore to see the round trip.

## Open items

- Nothing that can store a recipe ships before M2 (data safety) is complete.

## Standing constraints

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4). Data-safety features ship before data-entry features, always.
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
