import Testing
import KitchenCore
import KitchenTesting

/// Property 11: Unit preference consistency — with a system preference every
/// convertible ingredient displays in that system and every other one
/// passes through; Original changes nothing. Validates: Requirements 9.4
@Suite struct P11UnitPreferenceTests {
    @Test(arguments: 0..<250)
    func preferenceAppliesToEveryConvertibleIngredient(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let ingredients = Gen<[Ingredient]>.array(of: RecipeGen.storedIngredient, count: 0...10).run(&rng)
        let factor = Fraction(Gen<Int>.int(in: 1...12).run(&rng), Gen<Int>.int(in: 1...6).run(&rng))

        #expect(QuantityPipeline.prepare(ingredients, factor: factor, preference: .original).map(\.unit) == ingredients.map(\.unit))

        for preference in [UnitPreference.us, .metric] {
            let displayed = QuantityPipeline.prepare(ingredients, factor: factor, preference: preference)
            for (original, shown) in zip(ingredients, displayed) {
                if let unit = original.unit, unit.isConvertible, original.quantity != nil {
                    #expect(shown.unit?.system == preference.system, "seed \(seed): \(original) → \(shown)")
                    #expect(shown.unit?.category == unit.category, "seed \(seed)")
                } else {
                    #expect(shown.unit == original.unit, "seed \(seed): \(original) → \(shown)")
                }
                #expect(shown.name == original.name && shown.id == original.id)
            }
        }
    }
}
