#!/usr/bin/env bash
# Archive + upload to TestFlight from this Mac — the same steps CI runs
# (.github/workflows/release.yml). Uses the App Store Connect API key when
# ASC_ISSUER_ID is exported, otherwise Xcode's signed-in Apple ID.
#
#   scripts/ship.sh
#   ASC_ISSUER_ID=<uuid> scripts/ship.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/App"
xcodegen generate >/dev/null

BUILD_NUMBER="$(git rev-list --count HEAD)"
MARKETING_VERSION="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null | sed 's/^v//')"
: "${MARKETING_VERSION:=$(grep -m1 'MARKETING_VERSION:' project.yml | sed -E 's/.*"([^"]+)".*/\1/')}"
ARCHIVE="$REPO_ROOT/build/KitchenBuddy.xcarchive"

AUTH=()
if [[ -n "${ASC_ISSUER_ID:-}" ]]; then
  KEY_ID="${ASC_KEY_ID:-656K26NVTL}"
  AUTH=(-authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_$KEY_ID.p8"
        -authenticationKeyID "$KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
fi

echo "==> Archiving Kitchen Buddy $MARKETING_VERSION ($BUILD_NUMBER)"
xcodebuild archive -project KitchenBuddy.xcodeproj -scheme KitchenBuddy \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  -allowProvisioningUpdates "${AUTH[@]}" -quiet

echo "==> Uploading to TestFlight"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates "${AUTH[@]}"
