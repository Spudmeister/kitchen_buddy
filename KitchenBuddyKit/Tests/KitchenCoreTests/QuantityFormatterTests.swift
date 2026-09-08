import Testing
import KitchenCore
import KitchenTesting

/// Feature: kitchen-buddy-ios, cookbook-style quantity display.
/// Validates: Requirements 8.2
@Suite struct QuantityFormatterTests {
    @Test(arguments: [
        (Fraction(3, 2), "1½"), (Fraction(3, 4), "¾"), (Fraction(2), "2"), (Fraction(0), "0"),
        (Fraction(3, 16), "3/16"), (Fraction(1, 100), "0.01"), (Fraction(3, 50), "0.06"),
        (Fraction(7, 3), "2⅓"), (Fraction(1, 10), "1/10"),
    ])
    func formats(quantity: Fraction, expected: String) {
        #expect(QuantityFormatter.string(for: quantity) == expected)
    }

    @Test func pairsWithUnits() {
        #expect(QuantityFormatter.string(quantity: Fraction(3, 2), unit: .cup) == "1½ cups")
        #expect(QuantityFormatter.string(quantity: Fraction(1), unit: .cup) == "1 cup")
        #expect(QuantityFormatter.string(quantity: Fraction(2), unit: .tsp) == "2 tsp")
        #expect(QuantityFormatter.string(quantity: nil, unit: .pinch) == "pinch")
        #expect(QuantityFormatter.string(quantity: Fraction(2), unit: .pinch) == "2 pinches")
        #expect(QuantityFormatter.string(quantity: Fraction(3), unit: .toTaste) == "to taste")
        #expect(QuantityFormatter.string(quantity: Fraction(3), unit: nil) == "3")
        #expect(QuantityFormatter.string(quantity: nil, unit: nil) == nil)
    }

    /// Every practically rounded quantity prints to text the parser reads
    /// back exactly (the editor pre-fills scaled values this way).
    @Test(arguments: 0..<300)
    func parserReadsFormatterOutput(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let quantity = Gen<Fraction>.quantity.run(&rng)
        let unit = RecipeGen.unit.run(&rng)
        let rounded = PracticalRounding.round(quantity, unit: unit)
        let text = QuantityFormatter.string(for: rounded)
        #expect(QuantityParser.parse(text) == rounded, "seed \(seed): \(rounded) → \(text)")
    }
}
