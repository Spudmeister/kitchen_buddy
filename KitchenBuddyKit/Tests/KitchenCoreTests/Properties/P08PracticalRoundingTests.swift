import Testing
import KitchenCore
import KitchenTesting

/// Property 8: Practical rounding — the result is in the allowed set for the
/// unit and within 1/8 (the table's widest gap is ¾ → 1; 1/4 for piece/dozen,
/// 1/2 for pinch/dash/to taste, 1/200 below 1/8). Validates: Requirements 8.2
@Suite struct P08PracticalRoundingTests {
    @Test(arguments: 0..<250)
    func resultIsPracticalAndClose(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let quantity = Gen<Fraction>.oneOf([
            Gen<Fraction>.quantity,
            Gen<Fraction> { rng in Fraction(Int.random(in: 1...4000, using: &rng), Int.random(in: 1...997, using: &rng)) },
        ]).run(&rng)
        let unit = RecipeGen.unit.run(&rng)
        let rounded = PracticalRounding.round(quantity, unit: unit)
        let error = (rounded - quantity).magnitude

        if quantity < Fraction(1, 8) {
            #expect(rounded.denominator == 100 || 100 % rounded.denominator == 0, "seed \(seed): \(rounded)")
            #expect(error <= Fraction(1, 200), "seed \(seed)")
            return
        }
        if (unit == .ml || unit == .g) && quantity >= .one {
            #expect(rounded.isWhole, "seed \(seed): \(rounded)")
            #expect(error <= Fraction(1, 2), "seed \(seed)")
            return
        }
        switch unit?.category {
        case .count:
            #expect(rounded.denominator == 1 || rounded.denominator == 2, "seed \(seed): \(rounded)")
            #expect(error <= Fraction(1, 4), "seed \(seed)")
        case .other:
            #expect(rounded.isWhole, "seed \(seed): \(rounded)")
            #expect(error <= Fraction(1, 2), "seed \(seed)")
        default:
            let allowed = [Fraction.zero] + PracticalRounding.practicalFractions.dropLast()
            #expect(allowed.contains(rounded.fractionalPart), "seed \(seed): \(rounded)")
            #expect(error <= Fraction(1, 8), "seed \(seed): \(quantity) → \(rounded)")
        }
    }
}
