import Foundation
import GRDB
import KitchenCore

/// Maintains `recipe_health`, the derived per-serving projection the
/// Library reads for badges and the "friendly" filter. `refresh` runs from
/// `SearchIndex.refresh`, so it sits inside every write transaction;
/// `rebuildAll` recomputes every row when the food table, the thresholds or
/// the derivation change (ADR-009).
///
/// Requirements: kitchen-buddy-ios 21.6, 21.8, 21.9
enum HealthIndex {
    static let versionKey = "health_index_version"
    /// Bumped when the derivation itself changes.
    static let derivationVersion = 1

    static var currentVersion: String {
        "\(FoodTable.version).\(HealthProfile.thresholdsVersion).\(derivationVersion)"
    }

    static func bandColumn(_ profile: HealthProfile) -> String {
        switch profile {
        case .diabetes: return "diabetes_band"
        case .bloodPressure: return "sodium_band"
        case .heartHealth: return "sat_fat_band"
        }
    }

    // MARK: Maintenance

    static func refresh(_ recipeID: Recipe.ID, _ db: Database) throws {
        guard let recipe = try RecipeSQL.recipe(recipeID, db),
              let version = try RecipeSQL.version(recipeID, number: recipe.currentVersion, db) else { return }
        let report = try RecipeSQL.latestServingReport(recipeID, db)
        let overrides = FoodOverride.effective(try RecipeSQL.foodOverrides(recipeID, db))
        let nutrition = NutritionEstimator.estimate(ingredients: version.ingredients,
                                                    servings: report?.servings ?? version.servings,
                                                    overrides: overrides)
        try upsert(nutrition.health, for: recipeID, db)
    }

    static func upsert(_ health: RecipeHealth, for recipeID: Recipe.ID, _ db: Database) throws {
        try db.execute(sql: """
            INSERT INTO recipe_health (recipe_id, index_version, effective_servings, coverage, carbs_g,
                available_carbs_g, glycemic_load, sodium_mg, saturated_fat_g, diabetes_band, sodium_band,
                sat_fat_band, computed_at)
            VALUES (:recipe_id, :version, :servings, :coverage, :carbs, :available, :gl, :sodium, :sat_fat,
                :diabetes, :bp, :heart, :computed_at)
            ON CONFLICT(recipe_id) DO UPDATE SET
                index_version = excluded.index_version, effective_servings = excluded.effective_servings,
                coverage = excluded.coverage, carbs_g = excluded.carbs_g,
                available_carbs_g = excluded.available_carbs_g, glycemic_load = excluded.glycemic_load,
                sodium_mg = excluded.sodium_mg, saturated_fat_g = excluded.saturated_fat_g,
                diabetes_band = excluded.diabetes_band, sodium_band = excluded.sodium_band,
                sat_fat_band = excluded.sat_fat_band, computed_at = excluded.computed_at
            """, arguments: [
                "recipe_id": recipeID.rawValue, "version": currentVersion,
                "servings": health.effectiveServings, "coverage": health.coverage,
                "carbs": health.carbohydrate, "available": health.availableCarbohydrate,
                "gl": health.glycemicLoad, "sodium": health.sodium, "sat_fat": health.saturatedFat,
                "diabetes": health.band(for: .diabetes).storageValue,
                "bp": health.band(for: .bloodPressure).storageValue,
                "heart": health.band(for: .heartHealth).storageValue,
                "computed_at": Timestamp.string(Date()),
            ])
    }

    static func markCurrent(_ db: Database) throws {
        try PreferencesStore.setValue(currentVersion, forKey: versionKey, db)
    }

    static func isStale(_ db: Database) throws -> Bool {
        try PreferencesStore.value(forKey: versionKey, db) != currentVersion
    }

    // MARK: Reads

    /// Fills `health` on each summary from `recipe_health`, one query for
    /// the page (at most `SearchIndex.resultLimit` ids).
    static func attach(to summaries: [RecipeSummary], _ db: Database) throws -> [RecipeSummary] {
        guard !summaries.isEmpty else { return summaries }
        let placeholders = Array(repeating: "?", count: summaries.count).joined(separator: ", ")
        var byID: [Recipe.ID: RecipeHealth] = [:]
        byID.reserveCapacity(summaries.count)
        // Positional reads: name lookups over 500 rows × 11 columns showed
        // up in the search p95.
        let cursor = try Row.fetchCursor(db, sql: """
            SELECT recipe_id, effective_servings, coverage, carbs_g, available_carbs_g, glycemic_load,
                   sodium_mg, saturated_fat_g, diabetes_band, sodium_band, sat_fat_band
            FROM recipe_health WHERE recipe_id IN (\(placeholders))
            """, arguments: StatementArguments(summaries.map { $0.id.rawValue }))
        while let row = try cursor.next() {
            let id: String = row[0]
            byID[Recipe.ID(id)] = RecipeHealth(
                effectiveServings: row[1], coverage: row[2], carbohydrate: row[3], availableCarbohydrate: row[4],
                glycemicLoad: row[5], sodium: row[6], saturatedFat: row[7],
                bands: [.diabetes: HealthBand(storageValue: row[8]), .bloodPressure: HealthBand(storageValue: row[9]),
                        .heartHealth: HealthBand(storageValue: row[10])])
        }
        return summaries.map { summary in
            var copy = summary
            copy.health = byID[summary.id]
            return copy
        }
    }

    static func health(from row: Row) -> RecipeHealth {
        RecipeHealth(
            effectiveServings: row["effective_servings"],
            coverage: row["coverage"],
            carbohydrate: row["carbs_g"],
            availableCarbohydrate: row["available_carbs_g"],
            glycemicLoad: row["glycemic_load"],
            sodium: row["sodium_mg"],
            saturatedFat: row["saturated_fat_g"],
            bands: [
                .diabetes: HealthBand(storageValue: row["diabetes_band"]),
                .bloodPressure: HealthBand(storageValue: row["sodium_band"]),
                .heartHealth: HealthBand(storageValue: row["sat_fat_band"]),
            ])
    }
}
