import Foundation
import Testing
@testable import KitchenCore

/// Feature: kitchen-buddy-ios, schema.org extraction over the committed
/// fixtures (JSON-LD, @graph with HowToSections, string instructions,
/// microdata). Validates: Requirements 12.1, 12.2, 12.6
@Suite struct SchemaOrgExtractorTests {
    static func fixture(_ name: String) throws -> String {
        let url = try #require(Bundle.module.url(forResource: name, withExtension: "html", subdirectory: "fixtures/url-html"))
        return try String(contentsOf: url, encoding: .utf8)
    }

    @Test func jsonLDBasic() throws {
        let extracted = try SchemaOrgExtractor.extract(html: try Self.fixture("jsonld-basic"), sourceURL: URL(string: "https://example.com/p"))
        let draft = extracted.draft
        #expect(extracted.source == "json-ld")
        #expect(draft.content.title == "Classic Pancakes")
        #expect(draft.content.description == "Fluffy & golden pancakes for a slow morning.")
        #expect(draft.content.prepMinutes == 10 && draft.content.cookMinutes == 15 && draft.content.servings == 4)
        #expect(draft.content.ingredients.count == 7)
        #expect(draft.content.ingredients[0] == IngredientDraft(name: "all-purpose flour", quantity: Fraction(3, 2), unit: .cup, category: .pantry))
        #expect(draft.content.ingredients[6] == IngredientDraft(name: "butter", quantity: Fraction(3), unit: .tbsp, notes: "melted", category: .dairy))
        #expect(draft.content.instructions.map(\.text) == ["Whisk the dry ingredients together.", "Add milk, egg and butter; stir until just combined.", "Cook on a hot griddle until bubbles form, then flip."])
        #expect(draft.tags == ["breakfast", "american", "pancakes", "brunch"])
        #expect(draft.content.sourceURL?.host == "example.com")
        #expect(extracted.imageURLs.map(\.absoluteString) == ["https://example.com/pancakes.jpg"])
        #expect(draft.isValid)
    }

    @Test func jsonLDGraphWithSections() throws {
        let draft = try SchemaOrgExtractor.extract(html: try Self.fixture("jsonld-graph-sections"), sourceURL: nil).draft
        #expect(draft.content.title == "Sunday Roast Chicken")
        #expect(draft.content.servings == 6)
        #expect(draft.content.prepMinutes == 20 && draft.content.cookMinutes == 100, "cook inferred from total − prep")
        #expect(draft.content.instructions.map(\.text) == ["Pat the chicken dry.", "Rub with oil, salt and pepper.", "Roast at 220°C for 1 hour 40 minutes."])
        #expect(draft.content.ingredients[0] == IngredientDraft(name: "whole chicken", quantity: Fraction(1), unit: nil, notes: "about 4 lb", category: .meat))
        #expect(draft.content.ingredients[2].name == "Salt and pepper" && draft.content.ingredients[2].quantity == nil)
        #expect(draft.content.ingredients[3] == IngredientDraft(name: "cloves garlic", quantity: Fraction(4), unit: nil, notes: "smashed", category: .produce))
    }

    @Test func jsonLDStringInstructionsAndYieldText() throws {
        let draft = try SchemaOrgExtractor.extract(html: try Self.fixture("jsonld-string-instructions"), sourceURL: nil).draft
        #expect(draft.content.title == "Quick Guacamole")
        #expect(draft.content.servings == 2)
        #expect(draft.content.prepMinutes == 0 && draft.content.cookMinutes == 10, "total alone lands in cook")
        #expect(draft.content.ingredients.map(\.name) == ["ripe avocados", "lime", "small onion", "Salt to taste"])
        #expect(draft.content.ingredients[2].quantity == Fraction(1, 2) && draft.content.ingredients[2].notes == "finely chopped")
        #expect(draft.content.instructions.map(\.text) == ["Mash the avocados.", "Stir in lime, onion and salt."])
    }

    @Test func microdataFallback() throws {
        let extracted = try SchemaOrgExtractor.extract(html: try Self.fixture("microdata"), sourceURL: nil)
        #expect(extracted.source == "microdata")
        let draft = extracted.draft
        #expect(draft.content.title == "Grandma's Tomato Soup")
        #expect(draft.content.description == "A pantry soup that tastes like a garden.")
        #expect(draft.content.prepMinutes == 5 && draft.content.cookMinutes == 25 && draft.content.servings == 4)
        #expect(draft.content.ingredients.count == 4 && draft.content.instructions.count == 3)
        #expect(draft.content.ingredients[2] == IngredientDraft(name: "cans crushed tomatoes", quantity: Fraction(2), unit: nil, notes: "14 oz", category: .produce))
        #expect(extracted.imageURLs.first?.absoluteString == "https://example.com/soup.jpg")
    }

    @Test func pagesWithoutARecipeFail() throws {
        #expect(throws: SchemaOrgExtractor.ExtractionError.noRecipeData) {
            try SchemaOrgExtractor.extract(html: try Self.fixture("no-recipe"), sourceURL: nil)
        }
    }

    /// P31 half one: every committed fixture parses to a title, ≥ 1
    /// ingredient, and ≥ 1 step.
    @Test(arguments: ["jsonld-basic", "jsonld-graph-sections", "jsonld-string-instructions", "microdata"])
    func everyFixtureYieldsAUsableDraft(name: String) throws {
        let draft = try SchemaOrgExtractor.extract(html: try Self.fixture(name), sourceURL: nil).draft
        #expect(!draft.content.title.isEmpty)
        #expect(!draft.content.ingredients.isEmpty && !draft.content.instructions.isEmpty)
        #expect(draft.isValid, "\(name): \(draft.validationErrors)")
    }

    @Test func durationsAndYields() {
        #expect(ISO8601Duration.minutes("PT1H30M") == 90)
        #expect(ISO8601Duration.minutes("PT45M") == 45)
        #expect(ISO8601Duration.minutes("PT2H") == 120)
        #expect(ISO8601Duration.minutes("P1DT2H") == 1560)
        #expect(ISO8601Duration.minutes("PT90S") == 2)
        #expect(ISO8601Duration.minutes("90 minutes") == nil)
        #expect(ISO8601Duration.string(minutes: 90) == "PT1H30M")
        #expect(SchemaOrgExtractor.servings("Makes 12 muffins") == 12)
        #expect(SchemaOrgExtractor.servings(["4", "4 servings"]) == 4)
        #expect(SchemaOrgExtractor.servings(6) == 6)
        #expect(SchemaOrgExtractor.servings("a few") == nil)
    }
}
