#!/usr/bin/env bash
#
# Build Kitchen Buddy, run it in the simulator, and capture a set of PNGs —
# the feedback loop for UI work, since `swift test` can't tell you a recipe
# page is unreadable.
#
# Each shot is one app launch described by launch arguments (deterministic,
# never goes stale the way a tap sequence does when a button moves).
#
#   scripts/screenshots.sh                  # every shot, default simulator
#   scripts/screenshots.sh library recipe   # just these
#   SIMULATOR="iPhone 17 Pro" scripts/screenshots.sh
#
# Output: build/screenshots/<name>.png (git-ignored).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIMULATOR="${SIMULATOR:-iPhone 17}"
BUNDLE_ID="net.puddleglum.kitchenbuddy"
OUT_DIR="$REPO_ROOT/build/screenshots"
DERIVED="$REPO_ROOT/build/DerivedData"

# name|sleep|extra launch arguments. Every launch also passes --uitest-reset.
# Launch arguments are owned by KitchenBuddyApp; add shots as screens land.
SHOTS=(
  "placeholder|3|"
  "settings|3|--seed demo --open settings"
  "backups|4|--seed demo --open backups"
  "recovery|4|--corrupt-db"
  "library|3|--seed demo"
  "recipe|3|--seed demo --open-recipe Bruschetta"
  "search|3|--seed demo --search chick"
  "editor|4|--seed demo --open-recipe Bruschetta --edit"
  "archived|3|--seed demo --open archived"
  "recipe-metric-6|3|--seed demo --units metric --default-servings 6 --open-recipe Bruschetta"
  "history|3|--seed demo --open-recipe Bruschetta --open history"
  "notes|3|--seed demo --open-recipe Bruschetta --open notes"
  "folders|3|--seed demo --open folders"
  "editor-suggestions|4|--seed demo --open-recipe Bruschetta --edit"
  "recipe-xxl|3|--seed demo --open-recipe Bruschetta -UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityXXL"
  "editor-xxl|4|--seed demo --open-recipe Bruschetta --edit -UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityXXL"
)

requested=("$@")

want() {
  [ ${#requested[@]} -eq 0 ] && return 0
  local name="$1"
  for r in "${requested[@]}"; do [ "$r" = "$name" ] && return 0; done
  return 1
}

echo "==> Generating Xcode project"
(cd "$REPO_ROOT/App" && xcodegen generate >/dev/null)

echo "==> Booting $SIMULATOR"
DEVICE_ID="$(xcrun simctl list devices available \
  | grep -E "^\s+${SIMULATOR} \(" \
  | head -1 | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')"
if [ -z "$DEVICE_ID" ]; then
  echo "No available simulator named '$SIMULATOR'. Options:" >&2
  xcrun simctl list devices available | grep -E "iPhone" >&2
  exit 1
fi
xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE_ID" -b >/dev/null 2>&1 || true

echo "==> Building"
xcodebuild \
  -project "$REPO_ROOT/App/KitchenBuddy.xcodeproj" \
  -scheme KitchenBuddy \
  -configuration Debug \
  -destination "id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED" \
  -quiet \
  build

APP_PATH="$(find "$DERIVED/Build/Products" -name "KitchenBuddy.app" -maxdepth 3 | head -1)"
[ -n "$APP_PATH" ] || { echo "Built app not found under $DERIVED" >&2; exit 1; }

echo "==> Installing $APP_PATH"
xcrun simctl install "$DEVICE_ID" "$APP_PATH"

mkdir -p "$OUT_DIR"

for shot in "${SHOTS[@]}"; do
  name="${shot%%|*}"
  rest="${shot#*|}"
  pause="${rest%%|*}"
  extra="${rest#*|}"
  want "$name" || continue

  echo "==> Capturing $name"
  xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true
  # shellcheck disable=SC2086  # $extra is a deliberate argument list
  xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID" --uitest-reset $extra >/dev/null
  sleep "$pause"
  xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUT_DIR/$name.png" >/dev/null 2>&1
  echo "    $OUT_DIR/$name.png"
done

xcrun simctl terminate "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true
echo "==> Done. $(ls -1 "$OUT_DIR" | wc -l | tr -d ' ') file(s) in $OUT_DIR"
