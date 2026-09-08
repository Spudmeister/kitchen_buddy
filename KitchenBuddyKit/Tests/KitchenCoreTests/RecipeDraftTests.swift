import Foundation
import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, editor save rules and normalization.
/// Validates: Requirements 1.4, 5.1
@Suite struct RecipeDraftTests {
    @Test func namesEveryFailingRule() {
        let empty = RecipeDraft(title: "  ", ingredients: [IngredientDraft(name: " ")], instructions: [InstructionDraft(text: "")])
        #expect(empty.validationErrors == [.emptyTitle, .noNamedIngredient, .noStep])
        let ok = RecipeDraft(title: "Toast", ingredients: [IngredientDraft(name: "bread")], instructions: [InstructionDraft(text: "Toast it.")])
        #expect(ok.isValid)
    }

    @Test func normalizesTextAndTags() {
        let draft = RecipeDraft(
            title: " Toast ", description: "  ",
            ingredients: [IngredientDraft(name: " bread ", notes: " "), IngredientDraft(name: "")],
            instructions: [InstructionDraft(text: " Toast it. ", durationMinutes: 0), InstructionDraft(text: "\n")],
            prepMinutes: -1, servings: 0,
            tags: ["  Vegan ", "vegan", "VEGAN", "", "quick  meal"]
        ).normalized()
        #expect(draft.content.title == "Toast")
        #expect(draft.content.description == nil)
        #expect(draft.content.ingredients == [IngredientDraft(name: "bread")])
        #expect(draft.content.instructions == [InstructionDraft(text: "Toast it.")])
        #expect(draft.content.prepMinutes == nil)
        #expect(draft.content.servings == nil)
        #expect(draft.tags == ["Vegan", "quick meal"])
    }

    @Test func versionContentRoundTripsThroughDraft() {
        let version = RecipeVersion(recipeID: Recipe.ID(), version: 1, title: "Pie",
                                    ingredients: [Ingredient(name: "apple", quantity: Fraction(3), unit: .piece)],
                                    instructions: [Instruction(step: 2, text: "Bake."), Instruction(step: 1, text: "Peel.")],
                                    servings: 8, createdAt: Date())
        let content = version.content
        #expect(content.instructions.map(\.text) == ["Peel.", "Bake."])
        #expect(content.ingredients == [IngredientDraft(name: "apple", quantity: Fraction(3), unit: .piece)])
        #expect(content.totalMinutes == nil)
    }
}
