import Foundation

/// Grams per US cup for common dry and semi-solid ingredients, so a cup of
/// flour converts to 125 g rather than 237 ml, and 250 g of flour back to
/// 2 cups. Matched by the longest keyword found in the ingredient name;
/// anything unmatched (milk, water, oil, stock…) stays on the volume path.
/// Values are the usual scoop-and-level figures from King Arthur / USDA
/// tables, rounded.
///
/// Requirements: kitchen-buddy-ios 9.1, 9.6 (ADR-008)
public enum IngredientDensity {
    public static let usCupMilliliters = 236.588

    /// keyword → grams per US cup.
    public static let gramsPerCup: [String: Double] = [
        // Flours and meals
        "all-purpose flour": 125, "all purpose flour": 125, "plain flour": 125, "bread flour": 127,
        "cake flour": 114, "pastry flour": 113, "whole wheat flour": 120, "wholemeal flour": 120,
        "self-rising flour": 125, "self-raising flour": 125, "rye flour": 103, "spelt flour": 120,
        "almond flour": 96, "coconut flour": 112, "rice flour": 158, "cornmeal": 138, "semolina": 167,
        "flour": 125,
        // Sugars and sweeteners
        "granulated sugar": 200, "caster sugar": 200, "superfine sugar": 200, "brown sugar": 213,
        "powdered sugar": 120, "confectioners sugar": 120, "icing sugar": 120, "sugar": 200,
        "honey": 340, "maple syrup": 312, "molasses": 340, "corn syrup": 328, "agave": 336,
        // Fats
        "butter": 227, "shortening": 191, "coconut oil": 218, "lard": 205, "peanut butter": 270,
        "almond butter": 256, "cream cheese": 232, "sour cream": 242, "yogurt": 245, "greek yogurt": 280,
        // Grains, starches, leaveners
        "rolled oats": 89, "oats": 89, "quick oats": 92, "rice": 185, "quinoa": 170, "couscous": 173,
        "cornstarch": 128, "cornflour": 128, "baking powder": 192, "baking soda": 220, "bicarbonate": 220,
        "cocoa powder": 85, "cocoa": 85, "breadcrumbs": 108, "panko": 50, "chocolate chips": 170,
        // Nuts, seeds, dried fruit
        "chopped nuts": 120, "walnuts": 117, "pecans": 110, "almonds": 143, "peanuts": 146,
        "raisins": 149, "chia seeds": 163, "sesame seeds": 144, "flaxseed": 150, "shredded coconut": 93,
        // Salt and spices (by volume they behave like solids)
        "table salt": 288, "kosher salt": 240, "sea salt": 272, "salt": 288,
        "cheese": 113, "parmesan": 100, "cheddar": 113,
    ]

    /// Keywords sorted longest first so "brown sugar" beats "sugar".
    static let orderedKeywords: [String] = gramsPerCup.keys.sorted { $0.count > $1.count }

    /// The density for an ingredient name, if a keyword matches.
    public static func gramsPerCup(for name: String) -> Double? {
        let lowered = name.lowercased()
        for keyword in orderedKeywords where lowered.contains(keyword) {
            return gramsPerCup[keyword]
        }
        return nil
    }

    /// Grams per millilitre for the ingredient, if known.
    public static func gramsPerMilliliter(for name: String) -> Double? {
        gramsPerCup(for: name).map { $0 / usCupMilliliters }
    }
}
