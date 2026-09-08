/// Exact scaling of ingredient quantities by a rational factor. Display
/// state only: nothing here touches stored recipes.
///
/// Requirements: kitchen-buddy-ios 8.1, 8.4, 8.5
public enum Scaler {
    /// `target / base`, or nil when either is not a positive number of
    /// servings (scaling is then disabled).
    public static func factor(from baseServings: Int?, to targetServings: Int) -> Fraction? {
        guard let base = baseServings, base > 0, targetServings > 0 else { return nil }
        return Fraction(targetServings, base)
    }

    public static func scale(_ quantity: Fraction, by factor: Fraction) -> Fraction {
        quantity * factor
    }

    public static func scale(_ ingredients: [Ingredient], by factor: Fraction) -> [Ingredient] {
        ingredients.map { ingredient in
            var copy = ingredient
            copy.quantity = ingredient.quantity.map { $0 * factor }
            return copy
        }
    }

    /// The version's ingredients scaled from its own servings to `servings`,
    /// or nil when the version has no servings value.
    public static func scale(_ version: RecipeVersion, toServings servings: Int) -> [Ingredient]? {
        guard let factor = factor(from: version.servings, to: servings) else { return nil }
        return scale(version.ingredients, by: factor)
    }
}
