import Foundation
import Testing
@testable import KitchenCore

/// Feature: kitchen-buddy-ios, the bundled food table is well-formed: every
/// row has a source, sane nutrients, a glycemic index wherever there is
/// carbohydrate to speak of, and keywords the matcher can use.
/// Validates: Requirements 21.1, 21.5 (Property 33, ADR-009)
@Suite struct FoodTableTests {
    @Test func tableLoadsWithSources() {
        #expect(FoodTable.version >= 1)
        #expect(FoodTable.foods.count >= 200)
        #expect(FoodTable.nutrientSource.contains("USDA"))
        #expect(FoodTable.glycemicIndexSource.contains("Atkinson"))
    }

    @Test func everyRowIsWellFormed() {
        var ids = Set<String>()
        var keywords = Set<String>()
        for food in FoodTable.foods {
            #expect(ids.insert(food.id).inserted, "duplicate id \(food.id)")
            #expect(!food.name.isEmpty && !food.keywords.isEmpty, "\(food.id)")
            #expect(food.usdaDescription?.isEmpty == false, "\(food.id) has no nutrient source")
            let n = food.per100g
            #expect(n.carbohydrate >= 0 && n.fiber >= 0 && n.sodium >= 0 && n.saturatedFat >= 0, "\(food.id)")
            #expect(n.fiber <= n.carbohydrate + 0.01, "\(food.id): fibre exceeds carbohydrate")
            #expect(n.carbohydrate <= 100 && n.saturatedFat <= 100, "\(food.id)")
            if let gi = food.glycemicIndex {
                #expect((0...150).contains(gi.value), "\(food.id) GI \(gi.value)")
                #expect(gi.basis.hasPrefix("measured") || gi.basis.hasPrefix("proxy") || gi.basis.hasPrefix("assumed"), "\(food.id): \(gi.basis)")
            } else {
                #expect(n.availableCarbohydrate < NutritionEstimator.noIndexCarbohydrateLimitPer100g,
                        "\(food.id) has \(n.availableCarbohydrate) g available carbohydrate but no glycemic index")
                #expect(food.glycemicIndexNote?.isEmpty == false, "\(food.id)")
            }
            for keyword in food.keywords {
                #expect(keyword == FoodMatcher.normalize(keyword), "\(food.id): keyword “\(keyword)” isn't normalized")
                #expect(keywords.insert(keyword).inserted, "keyword “\(keyword)” appears twice")
            }
            if let each = food.unitGrams { #expect(each > 0 && each <= 2000, "\(food.id)") }
            if let cup = food.cupGrams { #expect(cup > 10 && cup <= 400, "\(food.id)") }
        }
    }

    @Test func lookupsAndSearch() throws {
        let flour = try #require(FoodTable.food(id: "flour-white"))
        #expect(flour.cupGrams == 125 && flour.glycemicIndex?.value == 75)
        #expect(FoodTable.search("chick").map(\.id).contains("chicken-breast"))
        #expect(FoodTable.search("garbanzo").map(\.id) == ["chickpeas"])
        #expect(FoodTable.search("").count == FoodTable.foods.count)
    }
}
