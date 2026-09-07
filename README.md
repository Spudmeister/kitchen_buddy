# Kitchen Buddy

A digital recipe book for iPhone: your recipes, versions of them as they
evolve, variants and their lineage, cooking notes, serving-size scaling with
cookbook-style fractions, US/metric conversion, photos, fast full-text search,
folders, and import from recipe websites. Local-first SQLite with verified
on-device snapshots and iCloud Drive backups — losing a recipe book is the
one failure this app is designed never to have.

Native SwiftUI, iOS 17+, iPhone only. Distributed through TestFlight.

## Build locally

Xcode 26+, `brew install xcodegen`.

```sh
cd KitchenBuddyKit && swift test                       # headless tests
cd App && xcodegen generate && open KitchenBuddy.xcodeproj
```

## Ship it (CI → TestFlight)

Every push to `main` runs `.github/workflows/release.yml`: `swift test`, then
archive + upload to TestFlight. The job skips (with a warning) until these repo
secrets exist:

```sh
gh secret set CI_CERT_P12      --body "$(base64 -i ci.p12)"   # dedicated CI signing cert, see ADR-004
gh secret set CI_CERT_PASSWORD --body '<p12 password>'
gh secret set ASC_KEY_ID       --body '<10-char App Store Connect API key ID>'
gh secret set ASC_ISSUER_ID    --body '<Issuer ID UUID>'
gh secret set ASC_KEY_P8       < AuthKey_XXXXXXXXXX.p8
```

Set the `CI_CERT_*` secrets **before** the `ASC_*` ones: a runner without the
CI certificate mints a new development certificate on every run and the Apple
account's certificate cap is shared by every app on the team (ADR-004).

One-time, by hand: register the App IDs, App Group, and iCloud container
(open the project in Xcode once, Signing & Capabilities on both targets), and
create the app record in App Store Connect (the API refuses that call).

From this Mac instead: `scripts/ship.sh` (same commands CI runs).

**When the job fails at code signing** with "maximum number of certificates":
CI ran without `CI_CERT_P12`. List and revoke the "Created via API" certs with
`backgammon/scripts/asc.py certs` / `revoke-stale`, set the secrets, rerun.

## Versioning

The marketing version is the latest `v*` tag reachable from `HEAD` (fallback:
`App/project.yml`); the build number is the commit count. A version is a tag,
so `git push --atomic origin main vX.Y.Z` ships and releases in one run (ADR-002).

## Layout

- `KitchenBuddyKit/` — the app as an SPM package (`KitchenCore`,
  `KitchenPersistence`, `KitchenUI`, `KitchenTesting`)
- `App/` — XcodeGen shell, share extension, UI tests
- `docs/decisions/` — ADRs; `docs/ROADMAP.md` — status
- `.kiro/specs/kitchen-buddy-ios/` — requirements, design, tasks

## Data safety

Recipes are never hard-deleted (database triggers enforce it). The app takes
verified SQLite snapshots automatically, checks integrity at launch, restores
from the newest verified snapshot if the live file is damaged (keeping the
damaged file), and mirrors the newest snapshot to iCloud Drive. Export any
recipe, folder, or the whole book as `.kbrecipes` (documented JSON) or PDF.

## History

This repo was the Sous Chef PWA (TypeScript/React/sql.js) until 2026-09; see
ADR-001 and `git log -- src`.

MIT License.
