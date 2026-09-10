#!/usr/bin/env bash
#
# Write the per-schema-version fixture database that MigrationFixtureTests
# opens forever (iron rule 2). Run ONCE when a new migration lands, for the
# schema version that migration starts from — never regenerate an existing
# fixture, that is the point of it.
#
#   scripts/make-schema-fixture.sh 2          # writes kb-schema-v2.sqlite
#
# Run it on the commit BEFORE the next migration is added, so the file holds
# the schema version named. The generator is the env-gated test
# `MigrationFixtureTests/writeSchemaFixture`.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:?usage: make-schema-fixture.sh <schema version number>}"
OUT="$REPO_ROOT/KitchenBuddyKit/Tests/KitchenPersistenceTests/fixtures/kb-schema-v${VERSION}.sqlite"
if [ -f "$OUT" ] && [ "${FORCE:-}" != "1" ]; then
  echo "$OUT already exists. Fixtures are never regenerated; set FORCE=1 if you really mean it." >&2
  exit 1
fi
cd "$REPO_ROOT/KitchenBuddyKit"
KB_WRITE_SCHEMA_FIXTURE="$OUT" swift test --filter 'MigrationFixtureTests/writeSchemaFixture'
echo "Wrote $OUT"
