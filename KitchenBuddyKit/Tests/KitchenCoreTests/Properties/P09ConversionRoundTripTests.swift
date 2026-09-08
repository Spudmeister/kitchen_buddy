import Testing
import KitchenCore
import KitchenTesting

/// Property 9: Conversion round-trip — US → metric → US within 1%.
/// Validates: Requirements 9.5
@Suite struct P09ConversionRoundTripTests {
    @Test(arguments: 0..<250)
    func roundTripStaysWithinOnePercent(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let unit = Gen<IngredientUnit>.element(of: IngredientUnit.allCases.filter { $0.system == .us }).run(&rng)
        let quantity = Gen<Fraction>.quantity.run(&rng)
        let metric = UnitConverter.convert(quantity, unit, to: .metric)
        let back = UnitConverter.convert(metric.quantity, metric.unit, to: .us)

        #expect(metric.unit.system == .metric, "seed \(seed)")
        #expect(back.unit.system == .us, "seed \(seed)")
        let original = quantity.doubleValue * UnitConverter.baseFactor(unit)!
        let returned = back.quantity.doubleValue * UnitConverter.baseFactor(back.unit)!
        #expect(abs(returned - original) <= original * 0.01, "seed \(seed): \(quantity) \(unit) → \(metric) → \(back)")
    }
}
