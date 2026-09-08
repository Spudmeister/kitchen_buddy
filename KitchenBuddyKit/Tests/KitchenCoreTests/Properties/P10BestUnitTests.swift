import Testing
import KitchenCore
import KitchenTesting

/// Property 10: Best-unit selection — the chosen unit is the largest whose
/// threshold is met. Validates: Requirements 9.2
@Suite struct P10BestUnitTests {
    @Test(arguments: 0..<250)
    func chosenUnitIsLargestMeetingItsThreshold(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let category = Gen<IngredientUnit.Category>.element(of: [IngredientUnit.Category.volume, .weight]).run(&rng)
        let system = Gen<UnitSystem>.element(of: UnitSystem.allCases).run(&rng)
        let base = Double(Gen<Int>.int(in: 1...5_000_000).run(&rng)) / 100
        let ladder = try #require(UnitConverter.ladders[category]?[system])
        let chosen = try #require(UnitConverter.bestUnit(forBaseQuantity: base, category: category, system: system))
        let index = try #require(ladder.firstIndex { $0.unit == chosen })

        for smaller in ladder[..<index] {
            let bound = smaller.below ?? .infinity
            #expect(base >= bound, "seed \(seed): \(base) should have chosen \(smaller.unit.rawValue)")
        }
        if let bound = ladder[index].below {
            #expect(base < bound, "seed \(seed): \(base) exceeds \(chosen)")
        }
        #expect(chosen.system == system && chosen.category == category)
    }
}
