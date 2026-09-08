/// Fixed-factor conversion between US and metric volume and weight, with
/// best-unit selection by magnitude. Count and descriptive units pass
/// through untouched. Arithmetic goes through Double and is re-rationalized
/// (denominator ≤ 1000) so the result feeds the exact pipeline again.
///
/// Requirements: kitchen-buddy-ios 9.1, 9.2, 9.4, 9.5
public enum UnitConverter {
    public static let millilitersPerUnit: [IngredientUnit: Double] = [
        .tsp: 4.92892, .tbsp: 14.7868, .fluidOunce: 29.5735, .cup: 236.588,
        .pint: 473.176, .quart: 946.353, .gallon: 3785.41,
        .ml: 1, .l: 1000,
    ]

    public static let gramsPerUnit: [IngredientUnit: Double] = [
        .oz: 28.3495, .lb: 453.592,
        .g: 1, .kg: 1000,
    ]

    /// Best-unit ladders: the first unit whose upper bound (in base units)
    /// exceeds the quantity wins; the last rung has no bound.
    public struct Rung: Sendable {
        public let below: Double?
        public let unit: IngredientUnit
    }

    public static let ladders: [IngredientUnit.Category: [UnitSystem: [Rung]]] = [
        .volume: [
            .us: [Rung(below: 14.7868, unit: .tsp), Rung(below: 59.1471, unit: .tbsp),
                  Rung(below: 946.353, unit: .cup), Rung(below: 3785.41, unit: .quart),
                  Rung(below: nil, unit: .gallon)],
            .metric: [Rung(below: 1000, unit: .ml), Rung(below: nil, unit: .l)],
        ],
        .weight: [
            .us: [Rung(below: 453.592, unit: .oz), Rung(below: nil, unit: .lb)],
            .metric: [Rung(below: 1000, unit: .g), Rung(below: nil, unit: .kg)],
        ],
    ]

    public static let maxDenominator = 1000

    /// Millilitres or grams per one of `unit`; nil for non-convertible units.
    public static func baseFactor(_ unit: IngredientUnit) -> Double? {
        millilitersPerUnit[unit] ?? gramsPerUnit[unit]
    }

    /// `quantity` of `from` expressed in `to`, or nil when the units are not
    /// both volume or both weight.
    public static func convert(_ quantity: Fraction, from: IngredientUnit, to: IngredientUnit) -> Fraction? {
        if from == to { return quantity }
        guard from.category == to.category,
              let fromFactor = baseFactor(from), let toFactor = baseFactor(to) else { return nil }
        return Fraction.rationalizing(quantity.doubleValue * fromFactor / toFactor, maxDenominator: maxDenominator)
    }

    /// The unit in `system` that best fits `baseQuantity` millilitres/grams.
    public static func bestUnit(forBaseQuantity baseQuantity: Double,
                                category: IngredientUnit.Category, system: UnitSystem) -> IngredientUnit? {
        guard let ladder = ladders[category]?[system] else { return nil }
        for rung in ladder {
            if let bound = rung.below, baseQuantity < bound { return rung.unit }
            if rung.below == nil { return rung.unit }
        }
        return ladder.last?.unit
    }

    /// Converts into the best unit of `system` (48 tsp → 1 cup, 1,200 ml →
    /// 1.2 l, 1 cup → 237 ml); pass-through when the unit is not convertible.
    public static func convert(_ quantity: Fraction, _ unit: IngredientUnit,
                               to system: UnitSystem) -> (quantity: Fraction, unit: IngredientUnit) {
        guard unit.isConvertible, let factor = baseFactor(unit) else {
            return (quantity, unit)
        }
        let base = quantity.doubleValue * factor
        guard let target = bestUnit(forBaseQuantity: base, category: unit.category, system: system),
              let converted = convert(quantity, from: unit, to: target) else {
            return (quantity, unit)
        }
        return (converted, target)
    }

    public static func convert(_ ingredient: Ingredient, to system: UnitSystem) -> Ingredient {
        guard let quantity = ingredient.quantity, let unit = ingredient.unit else { return ingredient }
        let result = convert(quantity, unit, to: system)
        var copy = ingredient
        copy.quantity = result.quantity
        copy.unit = result.unit
        return copy
    }

    /// Applies the unit preference: as written for `.original`, otherwise
    /// every convertible ingredient in that system.
    public static func convert(_ ingredients: [Ingredient], preference: UnitPreference) -> [Ingredient] {
        guard let system = preference.system else { return ingredients }
        return ingredients.map { convert($0, to: system) }
    }
}
