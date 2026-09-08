/// The display pipeline for one ingredient: scale exactly, convert to the
/// preferred system, round to a practical measure. Formatting is the last
/// step and is left to the caller (`QuantityFormatter`).
///
/// Requirements: kitchen-buddy-ios 8.1, 8.2, 9.4
public enum QuantityPipeline {
    public static func prepare(_ ingredient: Ingredient, factor: Fraction = .one,
                               preference: UnitPreference = .original) -> Ingredient {
        var scaled = ingredient
        scaled.quantity = ingredient.quantity.map { Scaler.scale($0, by: factor) }
        let converted = UnitConverter.convert([scaled], preference: preference)[0]
        var rounded = converted
        rounded.quantity = converted.quantity.map { PracticalRounding.round($0, unit: converted.unit) }
        return rounded
    }

    public static func prepare(_ ingredients: [Ingredient], factor: Fraction = .one,
                               preference: UnitPreference = .original) -> [Ingredient] {
        ingredients.map { prepare($0, factor: factor, preference: preference) }
    }
}
