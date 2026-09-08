# Roadmap

**Status (2026-09-07):** M0 complete. PR #4 merged; first TestFlight build
**0.1.0 (32)** uploaded from `main` (placeholder screen, no data). 9 package
tests + 1 UI test green. Secrets set; CI cert NQKL4TJQ4B. iCloud entitlements
on and signing verified. Next: M1.

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | next |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | |
| M4 Scaling, units, tags, search polish | | |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | |
| M6 Photos | | |
| M7 URL import + Share Extension | | |
| M8 Export / import / PDF → **v0.3.0** | | |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## Human steps remaining (Andrew)

None for M0/M1. Portal, App Store Connect record, secrets, and tester are done.

## Open items

- Nothing that can store a recipe ships before M2 (data safety) is complete.

## Standing constraints

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4). Data-safety features ship before data-entry features, always.
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
