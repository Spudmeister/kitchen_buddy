import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, keyword dietary detection. Validates: Requirements 5.2, 5.3
@Suite struct TagDetectorTests {
    @Test func classifiesByKeywordTables() {
        #expect(TagDetector.detect(ingredientNames: ["flour", "butter", "sugar"]) == [.vegetarian, .nutFree])
        #expect(TagDetector.detect(ingredientNames: ["tofu", "rice", "soy sauce"])
                == [.vegan, .vegetarian, .glutenFree, .dairyFree, .nutFree])
        #expect(TagDetector.detect(ingredientNames: ["Chicken Breast", "olive oil"])
                == [.glutenFree, .dairyFree, .nutFree, .lowCarb])
        #expect(TagDetector.detect(ingredientNames: []) == DietaryTag.allCases)
    }

    @Test func suggestionsSkipExistingTags() {
        let content = RecipeContent(title: "Salad", ingredients: [IngredientDraft(name: "kale")], instructions: [])
        #expect(TagDetector.suggestions(for: content, existingTags: ["Vegan", "GLUTEN-FREE"])
                == [.vegetarian, .dairyFree, .nutFree, .lowCarb])
    }
}
