# ADR-008: Dry ingredients convert by weight

**Status:** Accepted
**Date:** 2026-09-09

## Context

Metric cooks weigh flour and sugar; US cooks scoop them. Converting "1 cup
flour" to "237 ml" is technically a volume conversion and practically
useless. Beta feedback from Andrew on build 61: dry ingredients should
convert US volume → metric weight.

## Decision

- `IngredientDensity` holds grams per US cup for common dry and semi-solid
  ingredients (flours, sugars, fats, grains, starches, leaveners, nuts,
  salt, cheese), matched by the longest keyword found in the ingredient
  name ("brown sugar" beats "sugar"). Values are the usual scoop-and-level
  figures (King Arthur / USDA), rounded.
- `UnitConverter.convert(_ ingredient:to:)` tries the density path first:
  US volume → metric weight (best unit g/kg), metric weight → US volume
  (best unit tsp/tbsp/cup/quart/gallon). Everything else, including liquids
  and unknown names, converts within its own category as before. Original
  (as written) never converts.
- Precision: through Double and re-rationalised to a denominator ≤ 1000,
  then practical rounding — so 1 cup flour reads "125 g", 250 g flour reads
  "2 cups".

## Consequences

- Property P11 now allows the category to switch when a density applies.
- A recipe written in grams displays sensibly for a US cook and vice versa;
  a wrong keyword match shows a wrong-but-plausible weight, so the table
  prefers specific keywords and stays conservative.
- The table is a starting point; beta feedback can extend it (one line per
  ingredient).
