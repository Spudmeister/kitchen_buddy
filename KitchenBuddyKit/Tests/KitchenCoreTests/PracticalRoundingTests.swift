import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, exact port of the PWA rounding table.
/// Validates: Requirements 8.2
@Suite struct PracticalRoundingTests {
    @Test(arguments: [
        (Fraction(1, 3), IngredientUnit?.some(.cup), Fraction(1, 3)),
        (Fraction(333, 1000), .cup, Fraction(1, 3)),
        (Fraction(19, 10), .cup, Fraction(2)),            // .9 is nearest to 1
        (Fraction(41, 20), .cup, Fraction(2)),            // .05 < 1/16 floors
        (Fraction(17, 16), .cup, Fraction(9, 8)),         // exactly 1/16 rounds to 1/8
        (Fraction(3, 16), .cup, Fraction(1, 8)),          // tie between 1/8 and 1/4 → smaller
        (Fraction(5, 12), .cup, Fraction(1, 3)),          // tie between 1/3 and 1/2 → smaller
        (Fraction(1, 10), .tsp, Fraction(1, 10)),         // below 1/8: hundredths
        (Fraction(1, 16), .tsp, Fraction(3, 50)),         // 0.0625 → 0.06
        (Fraction(1, 64), .tsp, Fraction(1, 50)),         // 0.015625 → 0.02
        (Fraction(23, 10), .piece, Fraction(5, 2)),       // halves
        (Fraction(22, 10), .piece, Fraction(2)),
        (Fraction(14, 10), .pinch, Fraction(1)),          // wholes
        (Fraction(3, 2), .dash, Fraction(2)),             // half rounds up
        (Fraction(7, 4), nil, Fraction(7, 4)),            // no unit behaves like a measure
    ])
    func matchesTheTable(quantity: Fraction, unit: IngredientUnit?, expected: Fraction) {
        #expect(PracticalRounding.round(quantity, unit: unit) == expected)
    }
}
