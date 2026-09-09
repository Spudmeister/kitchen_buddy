# Kitchen Buddy — read this first

Kitchen Buddy is a **digital recipe book**: a native SwiftUI iPhone app (iOS 17+),
local SQLite (GRDB + FTS5), iCloud Drive snapshot backups, no backend, no ads,
no analytics, no AI. Scope is the recipe book only — no cook mode, shopping
lists, menus, or assistants. It replaced the Sous Chef PWA that lived in this
repo until 2026-09 (ADR-001); the old specs in `.kiro/specs/sous-chef*/`
remain the requirements source, `.kiro/specs/kitchen-buddy-ios/` is the live spec.

## Layout

- **`KitchenBuddyKit/`** — SPM package, all logic and views; tests run headless
  on macOS. Layered targets, dependency direction enforced:
  `KitchenCore` (pure types + functions, Foundation only) →
  `KitchenPersistence` (GRDB, files, network, backups — the only target that
  imports GRDB) → `KitchenUI` (SwiftUI + `@Observable` view models).
  `KitchenTesting` holds seeded generators; the app never links it.
- **`App/`** — thin XcodeGen shell: `project.yml` → generated
  `KitchenBuddy.xcodeproj` (never committed). Also the Share Extension
  (`ShareExtension/`, queues URLs through the App Group, never opens the DB)
  and the XCUITest target.
- **`docs/decisions/`** ADRs · **`docs/ROADMAP.md`** where we are ·
  **`.kiro/specs/kitchen-buddy-ios/`** requirements, design, tasks · **`scripts/`**.

## Iron rules

1. **Never hard-delete recipe data.** "Delete" in the UI means archive (a
   timestamp). Versions, ingredients, instructions, ratings are append-only and
   immutable; the database enforces it with abort triggers. Only `recipe_tags`,
   the derived search tables, and `preferences` may be rewritten.
2. **Migrations only add.** Tables, columns, indexes, triggers, backfills —
   never drop or rename a user-content table. `eraseDatabaseOnSchemaChange`
   stays false everywhere, including DEBUG. Every migration ships with a
   fixture database from the previous version that must open forever.
3. **One writer.** Every write goes through the `DatabasePool` in
   `KitchenPersistence` inside a transaction that also refreshes the search
   row. The share extension never touches the database.
4. **Back up before risky work.** Import, restore, and migration snapshot the
   database first; snapshots are verified (`integrity_check`) before they can
   displace older ones.
5. **Committed fixtures and export files decode forever.** The export format
   is versioned; readers for every past version stay.
6. **The package builds on macOS.** UIKit-only code goes behind
   `#if canImport(UIKit)` or into `App/`. CI's `build-app` job catches the reverse.

## Commands

- **Tests (headless):** `cd KitchenBuddyKit && swift test` (`--filter <Suite>` for one).
- **Generate + open:** `cd App && xcodegen generate && open KitchenBuddy.xcodeproj`.
- **Simulator build (what CI does on PRs):**
  `cd App && xcodebuild build -project KitchenBuddy.xcodeproj -scheme KitchenBuddy -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO`.
- **UI test:** `cd App && xcodebuild test -project KitchenBuddy.xcodeproj -scheme KitchenBuddy -destination 'platform=iOS Simulator,name=iPhone 17'`.
- **Screenshots:** `scripts/screenshots.sh [name ...]` → `build/screenshots/*.png`.
  The visual feedback loop; `swift test` can't tell you a page is unreadable.
- **Ship from this Mac:** `scripts/ship.sh` (same steps as CI).

## How things ship (SDLC)

- **Trunk-based.** PRs run `test` + `build-app`. **Every push to `main` runs
  `.github/workflows/release.yml`**, which archives and uploads to TestFlight.
  Tags `v*` cut a GitHub release **and set the marketing version** (ADR-002):
  plans end with a Release step naming the tag; push tag and main together
  (`git push --atomic origin main vX.Y.Z`). Build number = commit count.
- Use `[skip ci]` in commit subjects that don't change the app (docs, specs).
- **Pushing is Andrew's call, every time.** Approved plans run to completion —
  every step they name is authorized, including a push the plan names — but
  a step the plan doesn't name is not.
- **A question gets an answer, not an action.** "What's the plan?" means:
  state the plan, the current state, and the gap — then stop.
- **Say what's happening at every hand-off:** what was done, what wasn't,
  what happens next.
- **No dead controls.** A setting, menu item, toolbar action, or search
  token ships in the same build as the code that reads it — never as a
  placeholder for a later milestone. Before any tag, walk every screen and
  confirm each control does something (each milestone has a "control walk"
  task). Build 43 shipped three Settings rows nothing read; don't repeat it.
- **Watch what you push.** A push or merge is unfinished until its Actions
  run reports; never merge a PR before its checks are green; a red run on
  `main` is yours to fix without being asked.

## Spec-driven development

`.kiro/specs/kitchen-buddy-ios/{requirements,design,tasks}.md`. Cite requirement
numbers in doc comments and test headers (`Validates: Requirements 8.1`); check
tasks off in the same commit as the code; keep `docs/ROADMAP.md` current.

## Testing

Swift Testing (`@Suite`, `@Test`, `#expect`). One property-test file per design
property, header cites the property and requirement; generators live in
`KitchenTesting` (`Gen`, `SeededRandomSource` — the seed is in every failure
message). Fixtures under `Tests/<Target>Tests/fixtures/`. The XCUITest flow in
`App/UITests` is the on-device end-to-end check.

## Conventions

Swift 5 language mode on the 6.0 toolchain, `SWIFT_STRICT_CONCURRENCY: minimal`
(same as backgammon/cardplay); types written `Sendable`-clean anyway. One type
per file, `PascalCase.swift`. Value types for models; `@MainActor @Observable`
view models; SQL only in `KitchenPersistence`; no force-unwraps outside tests;
errors are typed enums. Native SwiftUI components over custom ones.

## ADR practice

Knowledge lives in the repo, not assistant memory. Decisions →
`docs/decisions/ADR-NNN-slug.md` (Status / Date / Context / Decision /
Consequences). If it's worth remembering, it's worth an ADR.

## Where we are

**Read `docs/ROADMAP.md` first in any new session.**
