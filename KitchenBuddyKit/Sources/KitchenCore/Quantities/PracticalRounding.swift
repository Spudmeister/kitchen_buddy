/// Rounds a scaled or converted quantity to something a cook can measure.
/// An exact port of the PWA's `roundToPractical`, in rational arithmetic:
///
/// - below 1/8 → nearest hundredth (tiny spice amounts keep precision)
/// - piece, dozen → nearest half
/// - pinch, dash, to taste → nearest whole
/// - otherwise: fractional part below 1/16 rounds down to the whole; else
///   the nearest of 1/8, 1/4, 1/3, 1/2, 2/3, 3/4, 1 (ties go to the smaller)
///
/// Requirements: kitchen-buddy-ios 8.2
public enum PracticalRounding {
    /// The fractional parts a cookbook prints, ascending, ending in a full unit.
    public static let practicalFractions: [Fraction] = [
        Fraction(1, 8), Fraction(1, 4), Fraction(1, 3), Fraction(1, 2),
        Fraction(2, 3), Fraction(3, 4), Fraction(1),
    ]

    public static func round(_ quantity: Fraction, unit: IngredientUnit?) -> Fraction {
        if quantity.isNegative { return -round(quantity.magnitude, unit: unit) }
        if quantity < Fraction(1, 8) { return roundHalfUp(quantity, denominator: 100) }

        switch unit?.category {
        case .count: return roundHalfUp(quantity, denominator: 2)
        case .other: return roundHalfUp(quantity, denominator: 1)
        case .volume, .weight, nil: break
        }

        let whole = quantity.whole
        let fractional = quantity.fractionalPart
        if fractional < Fraction(1, 16) { return Fraction(whole) }

        var closest = practicalFractions[0]
        var smallestDifference = (fractional - closest).magnitude
        for candidate in practicalFractions.dropFirst() {
            let difference = (fractional - candidate).magnitude
            if difference < smallestDifference {
                smallestDifference = difference
                closest = candidate
            }
        }
        return Fraction(whole) + closest
    }

    /// Nearest multiple of 1/denominator, halves rounding up (JS `Math.round`).
    private static func roundHalfUp(_ quantity: Fraction, denominator: Int) -> Fraction {
        let scaled = quantity * Fraction(denominator) + Fraction(1, 2)
        return Fraction(scaled.whole, denominator)
    }
}
