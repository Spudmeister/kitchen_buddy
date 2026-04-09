Log a cook session for a recipe you just finished cooking.

This command walks through recording actual prep time, cook time, rating, and notes, then persists the session via `StatisticsService`.

---

Steps:

1. **Find the recipe.** Ask the user:
   > Which recipe did you just cook? You can provide the recipe name or its ID.

   - If a name is given, call `RecipeService.searchRecipes(name)` and show the top matches (name + id) so the user can confirm the correct one.
   - If an ID is given, call `RecipeService.getRecipe(id)` directly.
   - If the recipe is not found, tell the user and exit.

2. **Collect session details.** Ask each question in order (allow the user to skip optional ones):

   - **Actual prep time** *(optional)*: "How many minutes did prep actually take? (press Enter to skip)"
   - **Actual cook time** *(optional)*: "How many minutes did cooking actually take? (press Enter to skip)"
   - **Rating** *(optional)*: "How would you rate this cook? Enter 1–5 stars, or press Enter to skip."
     - Validate that the value is an integer 1–5; re-prompt if invalid.
   - **Notes** *(optional)*: "Any notes about this cook session? (press Enter to skip)"
   - **Servings made**: "How many servings did you make?" (default: the recipe's `servings` field)

3. **Build the `CookSessionInput`:**
   ```typescript
   const input: CookSessionInput = {
     recipeId: recipe.id,
     date: new Date(),
     actualPrepMinutes: prepMinutes,   // undefined if skipped
     actualCookMinutes: cookMinutes,   // undefined if skipped
     servingsMade: servingsMade,
     notes: notes,                     // undefined if skipped
   };
   ```

4. **Log the session** by calling `StatisticsService.logCookSession(input)`.

5. **Log the rating** (if provided) by calling `StatisticsService.rateRecipe({ recipeId: recipe.id, rating, notes })`.

6. **Confirm success.** Print a summary:
   ```
   Cook session recorded!
   Recipe      : <recipe name>
   Date        : <today's date>
   Prep time   : <N min | —>
   Cook time   : <N min | —>
   Servings    : <N>
   Rating      : <★★★★☆ | not rated>
   Notes       : <text | —>
   Session ID  : <id>
   ```

7. If any step throws an error, print the error message and tell the user the session was **not** saved.

---

**Service references:**
- `RecipeService` is in `src/services/recipe-service.ts`
- `StatisticsService` is in `src/services/statistics-service.ts`
- `CookSessionInput` and `RatingInput` types are in `src/types/statistics.ts`

In the PWA, access these via the service factory pattern in `pwa/src/services/`.
