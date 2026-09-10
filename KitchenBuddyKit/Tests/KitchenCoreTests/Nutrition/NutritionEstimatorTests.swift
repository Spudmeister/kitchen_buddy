import Testing
@testable import KitchenCore

/// Feature: kitchen-buddy-ios, worked examples for the estimator: grams from
/// each unit family, nutrient and load arithmetic, coverage, overrides and
/// the bands that follow.
/// Validates: Requirements 21.2–21.5
@Suite struct NutritionEstimatorTests {
    func ingredient(_ name: String, _ quantity: Fraction? = nil, _ unit: IngredientUnit? = nil) -> Ingredient {
        Ingredient(name: name, quantity: quantity, unit: unit)
    }

    @Test func oneCupOfFlour() throws {
        let line = NutritionEstimator.line(ingredient("all-purpose flour", Fraction(1), .cup))
        #expect(line.status == .counted && line.match?.food.id == "flour-white")
        #expect(line.grams == 125)
        let n = try #require(line.nutrients)
        #expect(abs(n.carbohydrate - 95.375) < 0.01 && abs(n.fiber - 3.375) < 0.01)
        #expect(abs(n.availableCarbohydrate - 92.0) < 0.01)
        #expect(abs((line.glycemicLoad ?? 0) - 69.0) < 0.01, "75 × 92 ÷ 100")
    }

    @Test func weightsCountsAndVolumes() throws {
        let salt = NutritionEstimator.line(ingredient("salt", Fraction(1), .tsp))
        #expect(abs((salt.grams ?? 0) - 6.0) < 0.05 && abs((salt.nutrients?.sodium ?? 0) - 2325) < 20)
        #expect(salt.glycemicLoad == 0, "no glycemic index means no carbohydrate")

        let eggs = NutritionEstimator.line(ingredient("large eggs", Fraction(2), .piece))
        #expect(eggs.grams == 100 && eggs.gramsBasis == .unitWeight(grams: 50))
        #expect(abs((eggs.nutrients?.saturatedFat ?? 0) - 3.1) < 0.001)

        let dozen = NutritionEstimator.line(ingredient("eggs", Fraction(1), .dozen))
        #expect(dozen.grams == 600)

        let noUnit = NutritionEstimator.line(ingredient("onion", Fraction(1)))
        #expect(noUnit.grams == 110, "a bare count uses the unit weight")

        let beef = NutritionEstimator.line(ingredient("ground beef", Fraction(1), .lb))
        #expect(abs((beef.grams ?? 0) - 453.592) < 0.001 && beef.gramsBasis == .weight)

        let honey = NutritionEstimator.line(ingredient("honey", Fraction(1), .tbsp))
        #expect(abs((honey.grams ?? 0) - 21.25) < 0.1, "tbsp × 340 g per cup")
    }

    @Test func statusesAndCoverage() {
        let ingredients = [
            ingredient("all-purpose flour", Fraction(2), .cup),
            ingredient("Ingredient 1", Fraction(1), .cup),           // unmatched
            ingredient("salt", nil, .toTaste),                        // seasoning
            ingredient("salt", Fraction(1), .pinch),                  // seasoning
            ingredient("cumin", nil, nil),                            // seasoning (no quantity)
            ingredient("chicken breast", Fraction(1), .cup),          // chicken has a cup weight → counted
            ingredient("beef", Fraction(3), .piece),                  // no unit weight → not convertible
        ]
        let nutrition = NutritionEstimator.estimate(ingredients: ingredients, servings: 4)
        #expect(nutrition.lines.map(\.status) == [.counted, .unmatched, .seasoning, .seasoning, .seasoning, .counted, .unitNotConvertible])
        #expect(nutrition.countableLines == 4 && nutrition.countedLines == 2)
        #expect(abs(nutrition.coverage - 0.5) < 0.001 && !nutrition.isSufficient)
        #expect(nutrition.scores.allSatisfy { $0.band == .unknown }, "half the recipe unknown ⇒ no bands")
        #expect(nutrition.value(for: .diabetes) != nil, "the figure is still there for the worksheet")

        let overrides: [String: Food.ID?] = ["ingredient 1": nil, "beef": "steak"]
        let excluded = NutritionEstimator.estimate(ingredients: ingredients, servings: 4, overrides: overrides)
        #expect(excluded.lines[1].status == .excluded && excluded.lines[6].status == .counted)
        #expect(excluded.lines[6].match?.source == .override && excluded.lines[6].grams == 3 * 225)
        #expect(excluded.countableLines == 3 && excluded.countedLines == 3 && excluded.isSufficient)
    }

    @Test func perServingAndBands() throws {
        let bread = [
            ingredient("bread flour", Fraction(500), .g),
            ingredient("water", Fraction(350), .ml),
            ingredient("salt", Fraction(10), .g),
            ingredient("yeast", Fraction(7), .g),
        ]
        let loaf = NutritionEstimator.estimate(ingredients: bread, servings: 12)
        #expect(loaf.isSufficient)
        let gl = try #require(loaf.perServingGlycemicLoad)
        // 500 g × 73.6 g available × 0.75 = 276 total; 7 g yeast adds 0.3 → 23 per slice.
        #expect(abs(gl - 23.0) < 0.5, "\(gl)")
        #expect(loaf.score(for: .diabetes).band == .high)
        #expect(abs((loaf.perServing?.sodium ?? 0) - (10 * 387.58 + 350 * 0.04 + 7 * 0.51 + 500 * 0.02) / 12) < 5)
        #expect(loaf.score(for: .bloodPressure).band == .medium)
        #expect(loaf.score(for: .heartHealth).band == .low)

        let unknownServings = NutritionEstimator.estimate(ingredients: bread, servings: nil)
        #expect(unknownServings.perServing == nil && unknownServings.scores.allSatisfy { $0.band == .unknown })

        let health = loaf.health
        #expect(health.bands[.diabetes] == .high && health.effectiveServings == 12 && abs(health.coverage - 1) < 0.001)
    }

    @Test func bandsFollowThresholds() {
        #expect(HealthProfile.diabetes.band(for: 10) == .low && HealthProfile.diabetes.band(for: 10.5) == .medium)
        #expect(HealthProfile.diabetes.band(for: 19) == .medium && HealthProfile.diabetes.band(for: 19.5) == .high)
        #expect(HealthProfile.bloodPressure.band(for: 140) == .low && HealthProfile.bloodPressure.band(for: 601) == .high)
        #expect(HealthProfile.heartHealth.band(for: 4) == .low && HealthProfile.heartHealth.band(for: 8.1) == .high)
        #expect(HealthProfile.diabetes.band(for: nil) == .unknown)
        #expect(HealthProfile.diabetes.format(8.4) == "GL 8" && HealthProfile.heartHealth.format(6.25) == "Sat fat 6.2 g")
        #expect(HealthProfile.bloodPressure.format(320) == "Salt 320 mg" && HealthProfile.bloodPressure.formatValue(320) == "320 mg")
        #expect(HealthBand(storageValue: nil) == .unknown && HealthBand.high.storageValue == 2)
    }

    @Test func demoChiliIsMostlyUnderstood() {
        // The catering chili from the demo seed: every line resolves.
        let chili = [
            ingredient("ground beef", Fraction(20), .lb), ingredient("kidney beans", Fraction(10), .lb),
            ingredient("diced tomatoes", Fraction(5), .gallon), ingredient("onions", Fraction(10), .piece),
            ingredient("chili powder", Fraction(1), .cup), ingredient("cumin", Fraction(1, 2), .cup),
        ]
        let nutrition = NutritionEstimator.estimate(ingredients: chili, servings: 60)
        #expect(nutrition.coverage == 1)
        #expect(nutrition.score(for: .diabetes).band == .low, "\(nutrition.perServingGlycemicLoad ?? -1)")
    }
}
