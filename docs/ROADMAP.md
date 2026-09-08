# Roadmap

**Status (2026-09-08):** M1 complete on branch `m1/domain-persistence`
(not yet pushed). Domain types, exact scaling/rounding/conversion, dietary
detection, schema v1 with guard triggers + FTS5, the four stores behind the
`RecipeBook` facade, seeded generators, 73 package tests (P1–P20, P25, P30,
P32, no-hard-delete, 5,000-recipe search benchmark, schema-v1 fixture) green;
simulator build green. `--seed demo` loads the 34 sample recipes. No
user-visible change. Next: M2 (data safety) — nothing that stores a recipe
ships before it.

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M3 (usable recipe book), v0.2.0 at M5, v0.3.0 at M8, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | done, build 32 on TestFlight |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | done (branch, awaiting push) |
| M2 Data safety | verified snapshots, integrity check + recovery, iCloud mirror, Settings › Backups — **before any build can hold a recipe** | next |
| M3 Library + Detail + Editor | usable recipe book → **v0.1.0** | |
| M4 Scaling, units, tags, search polish | | |
| M5 Versions, lineage, notes, ratings, folders → **v0.2.0** | | |
| M6 Photos | | |
| M7 URL import + Share Extension | | |
| M8 Export / import / PDF → **v0.3.0** | | |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## Human steps remaining (Andrew)

Review and push `m1/domain-persistence` (PR → main uploads build to TestFlight; no user-visible change). Portal, App Store Connect record, secrets, and tester are done.

## Open items

- Nothing that can store a recipe ships before M2 (data safety) is complete.

## Standing constraints

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4). Data-safety features ship before data-entry features, always.
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
