# ADR-002: Version numbers come from tags, proposed in plans

**Status:** Accepted
**Date:** 2026-09-07 (adopted from cardplay's proposed ADR-013)

## Context

`MARKETING_VERSION` in `App/project.yml` is a literal nobody remembers to
bump; cardplay reached TestFlight labeled 0.1.0 for every build. The workflow
already has a `release` job for `v*` tags and checks out with full history.

## Decision

1. CI derives the marketing version at archive time:
   `git describe --tags --abbrev=0 --match 'v*' | sed 's/^v//'`, falling back
   to the `project.yml` literal until the first tag. The build number is
   `git rev-list --count HEAD`. Both are passed on the `xcodebuild` command
   line so the app and the share extension always agree.
2. Semver, loosely, keyed to milestones: minor for a milestone, patch for a
   feedback round, 1.0.0 for App Store readiness.
3. The decision is made in the plan: every plan ends with a **Release** step
   naming the tag and a "what to test" note. Approving the plan approves the
   number. Outside a plan the assistant never tags or edits `MARKETING_VERSION`.
4. Tag and main go up together so one run sees both:
   `git tag -a vX.Y.Z -m "..." && git push --atomic origin main vX.Y.Z`.

## Consequences

- Nothing to edit to bump; a version is a tag; the GitHub release carries the
  changelog.
- `docs/ROADMAP.md` status line records the version and build so a tester's
  "0.2.0 (71)" maps to a commit.
