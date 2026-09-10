# ADR-009: Health profiles from bundled tables; servings you actually get

**Status:** Accepted
**Date:** 2026-09-09

## Context

Beta feedback from Andrew on build 67: diabetes (and other common
conditions) should be first class. Recipes almost never carry nutrition, so
the app has to estimate it, the estimate has to be transparent and
auditable, and a simple colour scale should rank a recipe's friendliness
*per portion*. Separately, families rarely eat the portions a recipe
states, so users need to say "this is really 4 servings" without rewriting
the recipe.

Constraints from CLAUDE.md: no backend, no network at runtime, no AI, no
analytics; recipe data is never hard-deleted; migrations only add.

## Decision

1. **Data ships inside the app, from published sources.** A versioned
   `foods.json` in `KitchenCore` holds ~200 common foods: total
   carbohydrate, fibre, sodium and saturated fat per 100 g from USDA
   FoodData Central (US government work, public domain; the FDC id is kept
   per food), a glycemic index from the International Tables of Glycemic
   Index and Glycemic Load Values (Atkinson, Foster-Powell & Brand-Miller,
   *Diabetes Care* 2008; 2021 update) with the source and a `basis` note
   ("measured" or "proxy: white bread" when a close relative's value is
   used), a unit weight for countable foods, and a density for volume
   measures. Facts are reproduced with citation; the curated selection and
   the keyword mapping are ours. We do not scrape or bundle the University
   of Sydney database.
2. **The estimate is a pure, auditable function.** `NutritionEstimator`
   maps each ingredient line to a food by the longest keyword in its name
   (the `IngredientDensity` rule), converts the quantity to grams (weight →
   grams; volume → ml × density; count → unit weight), and computes
   available carbohydrate (total − fibre), glycemic load (GI × available
   carbohydrate ÷ 100), sodium and saturated fat per line, per recipe and
   per serving. Every line's match, keyword, grams basis, nutrients and GI
   source are surfaced in a worksheet. Lines that cannot be counted are
   listed with the reason. Coverage below 80% of countable lines yields
   "Not enough data", never a false green.
3. **Three profiles, banded per serving, colour never alone.** Diabetes on
   glycemic load (≤ 10 low, 11–19 medium, ≥ 20 high, the published GL
   bands). Blood pressure on sodium (≤ 140 mg low, the FDA "low sodium"
   claim; ≤ 600 mg medium; above high). Heart health on saturated fat
   (≤ 4 g low, ≤ 8 g medium, above high; a third and two thirds of the
   13 g/day AHA guidance). Each band has a word and a symbol as well as a
   colour. Diabetes is on by default; the others are switches in Settings ›
   Health, each shipping with its badge, chip and token.
4. **Corrections and serving counts are append-only annotations.** A food
   override (recipe + normalized ingredient name → food id or "don't
   count") and a serving report (count or "back to the recipe's") are new
   guarded tables; the latest row wins. The recipe's stated yield stays in
   the immutable version; the detail shows "Recipe says 8 · you get 4" and
   the effective count is the base for scaling, the default-servings
   preference and every per-serving figure. Both travel in export 2.1.
5. **Per-serving figures live in a derived table.** `recipe_health` is a
   rewritable projection like `recipe_search`, refreshed inside every write
   transaction and rebuilt when the food-table or threshold version
   changes, so Library badges and the "friendly" filter are plain SQL.
6. **It is an estimate, and says so.** Every badge and the worksheet carry
   "estimated from typical ingredients; not medical advice"; the Sources
   screen names the tables, the version and the thresholds.

## Consequences

- No network, no licence fee, no third-party terms; the data can be
  audited line by line in the repo and corrected by PR.
- Estimates are only as good as the mapping. Unusual ingredients fall out
  as "not counted", which is visible, and the user can fix a line once per
  recipe. The table version bump reruns every recipe.
- GI values for many cooked dishes are proxies; the worksheet shows the
  basis so a careful user can judge.
- Schema v3 adds tables only; v2 fixture committed before the migration.
- Export format 2.1 is a superset; 2.0 readers ignore the new arrays.
