# ADR-001: Native iOS rewrite in the same repo; the PWA is deleted

**Status:** Accepted
**Date:** 2026-09-07

## Context

kitchen_buddy was a TypeScript/React PWA experiment ("Sous Chef") covering
recipes, menus, shopping, cooking, statistics, and an AI assistant. Renewed
interest is in an MVP people can install on an iPhone and trust with their
recipe collection. The PWA's write side (recipe editor, URL import, folders)
was never built; the PWA held only fake test data.

## Decision

- Rewrite as a native SwiftUI iPhone app (iOS 17+), shipped via TestFlight
  with the same GitHub automation as backgammon/cardplay.
- Scope: the digital recipe book only. Cooking mode, shopping, menus, meal
  prep, substitutions, recommendations, statistics, and all AI features are
  out until the book is excellent.
- Same repository. The TypeScript code (`src/`, `pwa/`, `tests/`, npm config)
  is deleted in the bootstrap PR; the 34 fixture recipes were frozen as JSON
  first. The `.kiro/specs/sous-chef*/` specs stay as the requirements source;
  `.kiro/specs/kitchen-buddy-ios/` is the live spec.
- No data migration: the app ships a JSON importer for the old export format.

## Consequences

- One repo, one history: `git log -- src` still shows the experiment.
- The old CLAUDE.md GitFlow/npm workflow is replaced by trunk-based Swift
  conventions (CLAUDE.md, ADR-002).
- Sibling conventions (XcodeGen shell + SPM package, `swift test` headless on
  macOS, cloud-signed TestFlight uploads) apply here unchanged.
