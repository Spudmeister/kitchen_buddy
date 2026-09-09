import Testing
import KitchenCore
import KitchenTesting

/// Property 34: Estimator linearity — scaling every quantity by k scales the
/// totals by k; scaling quantities and servings together leaves per-serving
/// figures unchanged; a "don't count" override removes exactly that line;
/// coverage below 0.8 ⇒ every band unknown.
/// Validates: Requirements 21.2, 21.4
@Suite struct P34EstimatorLinearityTests {
    static let foodIngredient = Gen<Ingredient> { rng in
        let food = Gen<Food>.element(of: FoodTable.foods).run(&rng)
        let keyword = Gen<String>.element(of: food.keywords).run(&rng)
        let quantity = Fraction(Gen<Int>.int(in: 1...400).run(&rng), Gen<Int>.element(of: [1, 2, 3, 4, 8]).run(&rng))
        let unit: IngredientUnit? = Gen<IngredientUnit?>.oneOf([
            .always(.g), .always(.cup), .always(.tbsp), .always(.piece), .always(.oz), .always(nil), .always(.pinch),
        ]).run(&rng)
        return Ingredient(name: keyword, quantity: quantity, unit: unit)
    }

    static func close(_ a: Double, _ b: Double) -> Bool { abs(a - b) <= 1e-6 * max(1, abs(a), abs(b)) }

    @Test(arguments: 0..<250)
    func totalsScaleAndPerServingHolds(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let ingredients = Gen<[Ingredient]>.array(of: Self.foodIngredient, count: 1...10).run(&rng)
        let servings = Gen<Int>.int(in: 1...12).run(&rng)
        let k = Gen<Int>.int(in: 2...5).run(&rng)

        let base = NutritionEstimator.estimate(ingredients: ingredients, servings: servings)
        let scaled = NutritionEstimator.estimate(
            ingredients: ingredients.map { var copy = $0; copy.quantity = copy.quantity.map { $0 * Fraction(k) }; return copy },
            servings: servings * k)

        #expect(scaled.lines.map(\.status) == base.lines.map(\.status), "seed \(seed)")
        #expect(Self.close(scaled.totals.carbohydrate, base.totals.carbohydrate * Double(k)), "seed \(seed)")
        #expect(Self.close(scaled.totals.sodium, base.totals.sodium * Double(k)), "seed \(seed)")
        #expect(Self.close(scaled.totalGlycemicLoad, base.totalGlycemicLoad * Double(k)), "seed \(seed)")
        #expect(Self.close(scaled.perServingGlycemicLoad ?? -1, base.perServingGlycemicLoad ?? -1), "seed \(seed)")
        #expect(Self.close(scaled.perServing?.saturatedFat ?? -1, base.perServing?.saturatedFat ?? -1), "seed \(seed)")
        #expect(scaled.scores.map(\.band) == base.scores.map(\.band), "seed \(seed)")

        // Coverage rule.
        if base.coverage < RecipeNutrition.minimumCoverage {
            #expect(base.scores.allSatisfy { $0.band == .unknown }, "seed \(seed)")
        } else {
            #expect(base.scores.allSatisfy { $0.band != .unknown }, "seed \(seed): sufficient coverage with servings must band")
        }

        // Excluding one counted line removes exactly its contribution.
        if let counted = base.lines.first(where: { $0.status == .counted }) {
            let key = FoodMatcher.normalize(counted.ingredient.name)
            let overrides: [String: Food.ID?] = [key: nil]
            let without = NutritionEstimator.estimate(ingredients: ingredients, servings: servings, overrides: overrides)
            let removed = base.lines.filter { $0.status == .counted && FoodMatcher.normalize($0.ingredient.name) == key }
            let removedSodium = removed.reduce(0.0) { $0 + ($1.nutrients?.sodium ?? 0) }
            #expect(Self.close(without.totals.sodium, base.totals.sodium - removedSodium), "seed \(seed)")
            #expect(without.countedLines == base.countedLines - removed.count, "seed \(seed)")
            #expect(without.lines.filter { $0.status == .excluded }.count == removed.count, "seed \(seed)")
        }
    }
}
