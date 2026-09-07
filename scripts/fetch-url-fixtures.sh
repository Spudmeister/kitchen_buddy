#!/usr/bin/env bash
# Capture real recipe pages for ad-hoc parser checks. Output is git-ignored
# (KitchenBuddyKit/Tests/KitchenCoreTests/fixtures/url-html/live/); the
# committed fixtures are the hand-written ones beside it.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/KitchenBuddyKit/Tests/KitchenCoreTests/fixtures/url-html/live"
mkdir -p "$OUT"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
while IFS='|' read -r name url; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  echo "==> $name"
  curl -sSL --max-time 30 -A "$UA" "$url" -o "$OUT/$name.html" || echo "    failed: $url"
done <<'URLS'
allrecipes-chocolate-chip-cookies|https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
foodnetwork-chewy-cookies|https://www.foodnetwork.com/recipes/alton-brown/the-chewy-recipe-1914700
bonappetit-chocolate-chip-cookies|https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies
sallys-baking-chewy-cookies|https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/
simplyrecipes-granola|https://www.simplyrecipes.com/recipes/homemade_granola/
cookieandkate-granola|https://cookieandkate.com/best-granola-recipe/
foodcom-chocolate-chip-cookies|https://www.food.com/recipe/best-chocolate-chip-cookies-6344
epicurious-chocolate-chip-cookies|https://www.epicurious.com/recipes/food/views/best-chocolate-chip-cookies-51234640
kingarthur-chocolate-chip-cookies|https://www.kingarthurbaking.com/recipes/classic-chocolate-chip-cookies-recipe
seriouseats-chocolate-chip-cookies|https://www.seriouseats.com/the-best-chocolate-chip-cookies-recipe-the-food-lab
URLS
echo "==> Done: $(ls -1 "$OUT" | wc -l | tr -d ' ') file(s) in $OUT"
