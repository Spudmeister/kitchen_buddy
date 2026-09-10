import Foundation

/// Pure function from a version's ingredients, the effective servings and
/// the user's overrides to a `RecipeNutrition` (ADR-009). Grams come from
/// the unit: weights directly, volumes through the food's density (or the
/// `IngredientDensity` table), counts through the food's unit weight. A
/// food with no glycemic index is one with (almost) no carbohydrate, so its
/// load is zero.
///
/// Requirements: kitchen-buddy-ios 21.2–21.4
public enum NutritionEstimator {
    /// Foods without a glycemic index carry under this much available
    /// carbohydrate per 100 g (the table test enforces it), so their load is
    /// zero rather than unknown.
    public static let noIndexCarbohydrateLimitPer100g = 1.0

    /// - Parameter overrides: normalized ingredient name → food id, or nil
    ///   for "don't count".
    public static func estimate(ingredients: [Ingredient], servings: Int?,
                                overrides: [String: Food.ID?] = [:]) -> RecipeNutrition {
        RecipeNutrition(lines: ingredients.map { line($0, overrides: overrides) }, effectiveServings: servings)
    }

    public static func line(_ ingredient: Ingredient, overrides: [String: Food.ID?] = [:]) -> LineEstimate {
        if let unit = ingredient.unit, unit.category == .other {
            return LineEstimate(ingredient: ingredient, status: .seasoning)
        }
        guard let quantity = ingredient.quantity, quantity > .zero else {
            return LineEstimate(ingredient: ingredient, status: .seasoning)
        }

        let key = FoodMatcher.normalize(ingredient.name)
        let match: FoodMatch?
        if let override = overrides[key] {
            guard let foodID = override, let food = FoodTable.food(id: foodID) else {
                return LineEstimate(ingredient: ingredient, status: .excluded)
            }
            match = FoodMatch(food: food, source: .override)
        } else {
            match = FoodMatcher.match(ingredient.name)
        }
        guard let match else { return LineEstimate(ingredient: ingredient, status: .unmatched) }

        guard let (grams, basis) = grams(quantity: quantity.doubleValue, unit: ingredient.unit,
                                         name: ingredient.name, food: match.food) else {
            return LineEstimate(ingredient: ingredient, status: .unitNotConvertible, match: match)
        }
        let nutrients = match.food.per100g.scaled(by: grams / 100)
        let load = match.food.glycemicIndex.map { Double($0.value) * nutrients.availableCarbohydrate / 100 } ?? 0
        return LineEstimate(ingredient: ingredient, status: .counted, match: match, grams: grams,
                            gramsBasis: basis, nutrients: nutrients, glycemicLoad: load)
    }

    /// Grams for a quantity of the food, or nil when the measure can't be
    /// converted.
    static func grams(quantity: Double, unit: IngredientUnit?, name: String,
                      food: Food) -> (Double, LineEstimate.GramsBasis)? {
        switch unit?.category {
        case .weight:
            guard let unit, let factor = UnitConverter.gramsPerUnit[unit] else { return nil }
            return (quantity * factor, .weight)
        case .volume:
            guard let unit, let milliliters = UnitConverter.millilitersPerUnit[unit] else { return nil }
            guard let density = food.gramsPerMilliliter ?? IngredientDensity.gramsPerMilliliter(for: name) else { return nil }
            return (quantity * milliliters * density, .density(gramsPerMilliliter: density))
        case .count, .none:
            guard let each = food.unitGrams else { return nil }
            let pieces = unit == .dozen ? quantity * 12 : quantity
            return (pieces * each, .unitWeight(grams: each))
        case .other:
            return nil
        }
    }
}
