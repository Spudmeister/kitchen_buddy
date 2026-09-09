import Testing
import KitchenCore
import KitchenTesting

/// Property 33: Food matching — every food's own keywords resolve to that
/// food (or to a food whose longer keyword contains it), the match is
/// deterministic, and the reported keyword really is in the name.
/// Validates: Requirements 21.1, 21.2
@Suite struct P33FoodMatchingTests {
    @Test func everyKeywordFindsItsFood() {
        for food in FoodTable.foods {
            for keyword in food.keywords {
                let match = FoodMatcher.match(keyword)
                #expect(match?.food.id == food.id, "“\(keyword)” → \(match?.food.id ?? "nil"), expected \(food.id)")
            }
        }
    }

    static let modifiers = ["fresh", "chopped", "large", "diced", "organic", "finely minced", "ripe", "cold", "extra"]

    @Test(arguments: 0..<250)
    func matchIsDeterministicAndHonest(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let food = Gen<Food>.element(of: FoodTable.foods).run(&rng)
        let keyword = Gen<String>.element(of: food.keywords).run(&rng)
        let before = Gen<String>.element(of: Self.modifiers).optional(probability: 0.6).run(&rng)
        let after = Gen<String>.element(of: ["", ", sifted", " (optional)", ", divided"]).run(&rng)
        let name = [before, keyword.capitalized].compactMap { $0 }.joined(separator: " ") + after

        let first = FoodMatcher.match(name)
        #expect(first == FoodMatcher.match(name), "seed \(seed): non-deterministic for “\(name)”")
        guard let first else {
            Issue.record("seed \(seed): “\(name)” matched nothing")
            return
        }
        guard case .keyword(let matched) = first.source else {
            Issue.record("seed \(seed): keyword match reported as override")
            return
        }
        #expect((" " + FoodMatcher.normalize(name) + " ").contains(" " + matched + " "), "seed \(seed): “\(matched)” not in “\(name)”")
        #expect(matched.count >= keyword.count, "seed \(seed): a shorter keyword won over “\(keyword)”")
    }
}
