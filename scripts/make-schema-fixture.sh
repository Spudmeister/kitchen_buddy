#!/usr/bin/env bash
#
# Write the per-schema-version fixture database that MigrationFixtureTests
# opens forever (iron rule 2). Run ONCE when a new migration lands, for the
# schema version that migration starts from — never regenerate an existing
# fixture, that is the point of it.
#
#   scripts/make-schema-fixture.sh            # writes kb-schema-v1.sqlite
#
# The generator is the env-gated test `MigrationFixtureTests/writeSchemaV1Fixture`.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/KitchenBuddyKit/Tests/KitchenPersistenceTests/fixtures/kb-schema-v1.sqlite"
if [ -f "$OUT" ] && [ "${FORCE:-}" != "1" ]; then
  echo "$OUT already exists. Fixtures are never regenerated; set FORCE=1 if you really mean it." >&2
  exit 1
fi
cd "$REPO_ROOT/KitchenBuddyKit"
KB_WRITE_SCHEMA_FIXTURE="$OUT" swift test --filter 'MigrationFixtureTests/writeSchemaV1Fixture'
echo "Wrote $OUT"
