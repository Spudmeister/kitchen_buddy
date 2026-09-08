import Testing
import KitchenCore
import KitchenTesting

/// Feature: kitchen-buddy-ios, Fraction laws (foundation for Property 7:
/// Scaling Multiplies All Quantities). Validates: Requirements 1.3, 8.1
@Suite struct FractionTests {
    @Test func normalizes() {
        #expect(Fraction(2, 4) == Fraction(1, 2))
        #expect(Fraction(3, -6) == Fraction(-1, 2))
        #expect(Fraction(0, 7) == .zero)
        #expect(Fraction(6, 3).isWhole)
    }

    @Test func arithmeticIsExact() {
        #expect(Fraction(1, 3) + Fraction(1, 6) == Fraction(1, 2))
        #expect(Fraction(3, 4) * Fraction(3, 2) == Fraction(9, 8))
        #expect(Fraction(7, 4).whole == 1)
        #expect(Fraction(7, 4).fractionalPart == Fraction(3, 4))
    }

    @Test(arguments: [("1/3", 1, 3), ("2", 2, 1), ("-3/4", -3, 4)])
    func parsesAndPrintsCanonically(text: String, n: Int, d: Int) {
        let value = Fraction(parsing: text)
        #expect(value == Fraction(n, d))
        #expect(value?.description == text)
    }

    @Test func approximatesLegacyDoubles() {
        #expect(Fraction(approximating: 0.333) == Fraction(1, 3))
        #expect(Fraction(approximating: 0.667) == Fraction(2, 3))
        #expect(Fraction(approximating: 1.5) == Fraction(3, 2))
        #expect(Fraction(approximating: 0.125) == Fraction(1, 8))
        #expect(Fraction(approximating: .nan) == nil)
    }

    @Test(arguments: 0..<200)
    func multiplyThenDivideRoundTrips(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let a = Fraction(Gen<Int>.int(in: -48...48).run(&rng), Gen<Int>.int(in: 1...16).run(&rng))
        let f = Fraction(Gen<Int>.int(in: 1...12).run(&rng), Gen<Int>.int(in: 1...4).run(&rng))
        #expect((a * f) / f == a, "seed \(seed)")
    }
}
