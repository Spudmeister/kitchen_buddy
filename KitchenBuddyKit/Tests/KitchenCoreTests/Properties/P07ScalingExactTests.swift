import Testing
import KitchenCore
import KitchenTesting

/// Property 7: Scaling exact — every scaled quantity == q × t/b as a Fraction.
/// Validates: Requirements 8.1
@Suite struct P07ScalingExactTests {
    @Test(arguments: 0..<250)
    func scaledQuantitiesAreExactRationals(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let ingredients = Gen<[Ingredient]>.array(of: RecipeGen.storedIngredient, count: 1...8).run(&rng)
        let base = Gen<Int>.int(in: 1...12).run(&rng)
        let target = Gen<Int>.int(in: 1...40).run(&rng)
        let factor = Scaler.factor(from: base, to: target)
        #expect(factor == Fraction(target, base), "seed \(seed)")

        let scaled = Scaler.scale(ingredients, by: factor!)
        #expect(scaled.count == ingredients.count)
        for (original, result) in zip(ingredients, scaled) {
            #expect(result.quantity == original.quantity.map { $0 * Fraction(target, base) }, "seed \(seed)")
            #expect(result.id == original.id && result.unit == original.unit && result.name == original.name)
        }
        // Scaling back is the identity.
        let restored = Scaler.scale(scaled, by: Fraction(base, target))
        #expect(restored.map(\.quantity) == ingredients.map(\.quantity), "seed \(seed)")
    }

    @Test func scalingNeedsPositiveServings() {
        #expect(Scaler.factor(from: nil, to: 4) == nil)
        #expect(Scaler.factor(from: 0, to: 4) == nil)
        #expect(Scaler.factor(from: 4, to: 0) == nil)
    }
}
