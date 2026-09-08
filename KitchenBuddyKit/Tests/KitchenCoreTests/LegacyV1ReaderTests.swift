import Foundation
import Testing
import KitchenCore
import KitchenTesting

/// Feature: kitchen-buddy-ios, v1 JSON stays readable forever (iron rule 5).
/// Validates: Requirements 14.1
@Suite struct LegacyV1ReaderTests {
    @Test func readsEveryCommittedFixtureRecipe() throws {
        let drafts = try LegacyFixtures.recipesV1()
        #expect(drafts.count == 34)
        #expect(drafts.allSatisfy { $0.isValid })

        let bruschetta = try #require(drafts.first { $0.content.title == "Bruschetta" })
        #expect(bruschetta.content.ingredients.count == 6)
        #expect(bruschetta.content.ingredients[2] == IngredientDraft(name: "fresh basil", quantity: Fraction(1, 4), unit: .cup, category: .produce))
        #expect(bruschetta.content.instructions[0] == InstructionDraft(text: "Dice tomatoes and combine with basil.", durationMinutes: 5))
        #expect(bruschetta.content.prepMinutes == 15)
        #expect(bruschetta.content.servings == 8)
        #expect(bruschetta.tags == ["appetizer", "italian", "vegetarian", "party"])

        let spices = try #require(drafts.first { $0.content.title == "Spice Blend" })
        #expect(spices.content.ingredients.map(\.quantity) == [Fraction(1, 8), Fraction(1, 16), Fraction(1, 32), Fraction(1, 64), Fraction(1, 4)])
    }

    @Test func readsEnvelopeAndArrayShapes() throws {
        let envelope = """
        {"version":"1.0.0","recipes":[{"title":"Tea","ingredients":[{"name":"water","quantity":"1 1/2","unit":"cups"}],
          "instructions":[{"text":"Boil.","duration":{"minutes":3}}],"prepTime":{"minutes":1},"cookTime":{"minutes":4},
          "servings":2,"sourceUrl":"https://example.com/tea"}]}
        """
        let drafts = try LegacyV1Reader.read(Data(envelope.utf8))
        #expect(drafts.count == 1)
        #expect(drafts[0].content.ingredients[0] == IngredientDraft(name: "water", quantity: Fraction(3, 2), unit: .cup))
        #expect(drafts[0].content.instructions[0].durationMinutes == 3)
        #expect(drafts[0].content.prepMinutes == 1)
        #expect(drafts[0].content.cookMinutes == 4)
        #expect(drafts[0].content.sourceURL == URL(string: "https://example.com/tea"))

        let array = try LegacyV1Reader.read(Data("[{\"title\":\"A\"},{\"title\":\"B\"}]".utf8))
        #expect(array.map(\.content.title) == ["A", "B"])

        #expect(throws: LegacyV1Reader.ReaderError.notJSON) { try LegacyV1Reader.read(Data("nope".utf8)) }
        #expect(throws: LegacyV1Reader.ReaderError.unrecognizedShape) { try LegacyV1Reader.read(Data("{\"a\":1}".utf8)) }
    }
}
