import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, ingredient names map to foods by the longest
/// whole-word keyword, deterministically.
/// Validates: Requirements 21.2
@Suite struct FoodMatcherTests {
    @Test func normalizesNames() {
        #expect(FoodMatcher.normalize("  Crème Fraîche (optional), chilled ") == "creme fraiche chilled")
        #expect(FoodMatcher.normalize("Whole-wheat flour") == "whole wheat flour")
        #expect(FoodMatcher.normalize("Chicken breast (boneless, skinless)") == "chicken breast")
    }

    @Test(arguments: [
        ("all-purpose flour", "flour-white"), ("Whole Wheat Flour", "flour-whole-wheat"),
        ("brown sugar", "sugar-brown"), ("sugar snap peas", "snap-peas"), ("sugar", "sugar"),
        ("2 cloves garlic, minced", "garlic"), ("garlic", "garlic"), ("garlic powder", "spices"),
        ("Roma tomatoes", "tomato"), ("diced tomatoes (canned)", "tomatoes-canned"),
        ("coconut oil", "oil-coconut"), ("shredded coconut", "coconut-shredded"),
        ("large eggs", "eggs"), ("egg yolks", "egg-yolk"), ("eggplant", "eggplant"),
        ("red pepper flakes", "spices"), ("red pepper", "bell-pepper"),
        ("boneless skinless chicken breasts", "chicken-breast"), ("chicken thighs", "chicken-thigh"),
        ("low-sodium chicken broth", "broth-low-sodium"), ("chicken broth", "broth-chicken"),
        ("kidney beans", "beans-kidney"), ("green beans", "green-beans"),
        ("unsalted butter, softened", "butter-unsalted"), ("melted butter", "butter"),
        ("Greek yogurt", "yogurt-greek"), ("plain yogurt", "yogurt"),
        ("extra-virgin olive oil", "oil-olive"), ("fresh basil leaves", "herbs-fresh"),
        ("salt and pepper", "salt"), ("black pepper", "spices"),
        ("guanciale", "bacon"), ("pecorino romano", "cheese-parmesan"),
    ]) func matchesTheLongestKeyword(name: String, expected: String) {
        #expect(FoodMatcher.match(name)?.food.id == expected, "\(name)")
    }

    @Test func wholeWordsOnly() {
        #expect(FoodMatcher.match("veggie burger") == nil, "“egg” inside “veggie” must not match")
        #expect(FoodMatcher.match("Ingredient 1") == nil)
        #expect(FoodMatcher.match("") == nil)
        #expect(FoodMatcher.match("tamarind paste")?.food.id == "tamarind")
    }

    @Test func reportsTheKeyword() {
        #expect(FoodMatcher.match("2 cups all-purpose flour, sifted")?.source == .keyword("all purpose flour"))
    }
}
