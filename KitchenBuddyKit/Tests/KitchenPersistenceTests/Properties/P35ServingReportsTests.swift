import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 35: Serving reports and food overrides are append-only — their
/// counts never decrease, effective servings = latest report ?? version
/// servings (a nil report resets), and the latest override per ingredient
/// key wins with the automatic marker removing the key.
/// Validates: Requirements 20.1, 20.2, 20.4, 21.6, 21.10
@Suite struct P35ServingReportsTests {
    @Test(arguments: 0..<100)
    func latestReportWinsAndHistoryGrows(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        let own = created.version.servings

        var expected: Int?? = .none   // .none = no report yet; .some(x) = latest report x
        var history: [Int?] = []
        for _ in 0..<Gen<Int>.int(in: 1...12).run(&rng) {
            let servings = Gen<Int>.int(in: 1...20).optional(probability: 0.75).run(&rng)
            try book.recipes.reportServings(created.id, servings: servings, note: Bool.random(using: &rng) ? "n" : nil)
            history.append(servings)
            expected = .some(servings)
            let detail = try #require(try book.recipes.detail(created.id))
            let effective: Int? = { if case .some(let latest) = expected { return latest ?? own } else { return own } }()
            #expect(detail.effectiveServings == effective, "seed \(seed)")
            #expect(try book.recipes.servingReports(created.id).map(\.servings) == history, "seed \(seed)")
            #expect(try book.recipes.summaries(RecipeQuery(text: "")).first { $0.id == created.id }?.health?.effectiveServings == effective, "seed \(seed)")
        }
        #expect(throws: (any Error).self) { try book.recipes.reportServings(created.id, servings: 0, note: nil) }
        #expect(throws: (any Error).self) {
            try book.writer.write { db in try db.execute(sql: "DELETE FROM serving_reports") }
        }
    }

    @Test(arguments: 0..<100)
    func overridesLatestPerKey(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        let names = created.version.ingredients.map(\.name)
        var expected: [String: Food.ID?] = [:]
        var rows = 0
        for _ in 0..<Gen<Int>.int(in: 1...10).run(&rng) {
            let name = Gen<String>.element(of: names).run(&rng)
            let key = FoodMatcher.normalize(name)
            switch Int.random(in: 0..<3, using: &rng) {
            case 0:
                let food = Gen<String>.element(of: FoodTable.foods.map(\.id)).run(&rng)
                try book.recipes.setFoodOverride(created.id, ingredientName: name, foodID: food)
                expected[key] = .some(food)
            case 1:
                try book.recipes.setFoodOverride(created.id, ingredientName: name, foodID: nil)
                expected[key] = .some(nil)
            default:
                try book.recipes.clearFoodOverride(created.id, ingredientName: name)
                expected.removeValue(forKey: key)
            }
            rows += 1
            let stored = try book.recipes.foodOverrides(created.id)
            #expect(stored.count == rows, "seed \(seed)")
            #expect(FoodOverride.effective(stored) == expected, "seed \(seed)")
        }
        let nutrition = try #require(try book.recipes.nutrition(created.id))
        for line in nutrition.lines {
            let key = FoodMatcher.normalize(line.ingredient.name)
            guard let override = expected[key], line.status != .seasoning else { continue }
            if let food = override {
                #expect(line.match?.food.id == food && line.match?.source == .override, "seed \(seed)")
            } else {
                #expect(line.status == .excluded, "seed \(seed)")
            }
        }
        #expect(throws: (any Error).self) { try book.recipes.setFoodOverride(created.id, ingredientName: "x", foodID: "no-such-food") }
    }
}
