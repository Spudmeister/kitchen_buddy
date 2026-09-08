# Roadmap

**Status (2026-09-07):** M0 bootstrap on branch `ios/bootstrap` — package,
app shell, CI, docs, spec. Version 0.1.0 (fallback), no tag yet. 9 package
tests + 1 UI test green locally. First TestFlight build pending the one-time
human setup below.

Milestones and tasks: `.kiro/specs/kitchen-buddy-ios/tasks.md`. Tags:
v0.1.0 at M2 (usable recipe book), v0.2.0 at M4, v0.3.0 at M7, v0.4.0 at M9.

| Milestone | What lands | State |
|---|---|---|
| M0 Bootstrap | TS teardown, KitchenBuddyKit, App shell, CI, docs | in PR |
| M1 Domain + persistence | Fraction/units/scaling/rounding/tags, schema v1 + guards + FTS5, stores, properties | next |
| M2 Library + Detail + Editor | usable recipe book → **v0.1.0** | |
| M3 Scaling, units, tags, search polish | | |
| M4 Versions, lineage, notes, ratings, folders → **v0.2.0** | | |
| M5 Photos | | |
| M6 URL import + Share Extension | | |
| M7 Export / import / PDF → **v0.3.0** | | |
| M8 Backups, iCloud, Settings | | |
| M9 Polish, accessibility, Spotlight, beta → **v0.4.0** | | |

## One-time human setup (Andrew), in order

1. Developer portal via Xcode: `cd App && xcodegen generate && open KitchenBuddy.xcodeproj`;
   Signing & Capabilities on `KitchenBuddy` and `KitchenBuddyShare` → team
   7Y22MT85Z6 → let Xcode register the App IDs, create App Group
   `group.net.puddleglum.kitchenbuddy` and iCloud container
   `iCloud.net.puddleglum.kitchenbuddy` (permanent once created — spell it exactly).
2. App Store Connect → My Apps → + → iOS, "Kitchen Buddy", bundle id above, SKU `kitchenbuddy`.
3. CI cert first (ADR-004), then `ASC_*` secrets (README "Ship it").
4. Merge the PR / push main, `gh run watch`, then TestFlight → Internal Testing → add yourself.

## Open items

- iCloud entitlement is off until M8 (task 8.3.1): the container must be assigned to the App ID in the portal by hand before it goes back on.

## Standing constraints

- Losing the recipe database is unacceptable (CLAUDE.md iron rules 1–4).
- Search < 100 ms with 5,000 recipes on an iPhone.
- Recipe book only: no cooking mode, shopping, menus, or AI in this app until
  the book is excellent.
