import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, editor rules at the view-model level.
/// Validates: Requirements 1.2–1.6, 2.1, 2.2
@Suite struct RecipeEditorViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let book = try TestDatabase.inMemory()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    @Test @MainActor func saveRulesAndFractionEntry() throws {
        let environment = try Self.environment()
        let model = RecipeEditorViewModel(environment: environment)
        #expect(!model.canSave && !model.hasChanges)
        #expect(model.problems.count == 3)

        model.title = "Pancakes"
        model.ingredients[0].name = "flour"
        model.ingredients[0].quantityText = "1 1/2"
        model.ingredients[0].unit = .cup
        model.steps[0].text = "Mix."
        #expect(model.canSave && model.hasChanges)

        model.ingredients[0].quantityText = "one"
        #expect(!model.canSave && model.problems.contains { $0.hasPrefix("Enter quantities") })
        model.ingredients[0].quantityText = "¾"
        model.sourceText = "not a url"
        #expect(!model.canSave)
        model.sourceText = "https://example.com/pancakes"
        #expect(model.canSave)

        let id = try #require(model.save())
        let detail = try #require(try environment.book.recipes.detail(id))
        #expect(detail.version.ingredients[0].quantity == Fraction(3, 4))
        #expect(detail.version.ingredients[0].unit == .cup)
        #expect(detail.version.sourceURL?.host == "example.com")
    }

    @Test @MainActor func editingVersionsOnlyContentChanges() throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(RecipeDraft(
            title: "Toast", ingredients: [IngredientDraft(name: "bread", quantity: Fraction(2), unit: .piece)],
            instructions: [InstructionDraft(text: "Toast it.", durationMinutes: 3)], servings: 1, tags: ["Breakfast"]))
        let model = try #require(RecipeEditorViewModel.editing(created.id, in: environment))
        #expect(!model.isNew && !model.hasChanges && model.canSave)
        #expect(model.ingredients[0].quantityText == "2" && model.steps[0].minutesText == "3")

        // Whitespace-only edits are not changes.
        model.title = " Toast "
        #expect(!model.hasChanges)
        model.tags = ["Breakfast", "Quick"]
        #expect(model.hasChanges)
        _ = model.save()
        #expect(try environment.book.recipes.detail(created.id)?.recipe.currentVersion == 1, "tags do not version")

        let again = try #require(RecipeEditorViewModel.editing(created.id, in: environment))
        again.moveSteps(from: IndexSet(integer: 0), to: 0)
        again.addStep()
        again.steps[1].text = "Butter it."
        again.moveIngredients(from: IndexSet(integer: 0), to: 0)
        #expect(again.hasChanges)
        _ = again.save()
        let detail = try #require(try environment.book.recipes.detail(created.id))
        #expect(detail.recipe.currentVersion == 2)
        #expect(detail.version.instructions.map(\.text) == ["Toast it.", "Butter it."])
        #expect(detail.tags == ["Breakfast", "Quick"])
    }

    @Test @MainActor func detailActions() throws {
        let environment = try Self.environment()
        let folder = try environment.book.folders.create(name: "Breakfast", parentID: nil)
        let created = try environment.book.recipes.create(RecipeDraft(
            title: "Toast", ingredients: [IngredientDraft(name: "bread")], instructions: [InstructionDraft(text: "Toast it.")]))
        let model = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        model.load()
        #expect(model.detail?.title == "Toast" && !model.isReadOnly)
        model.toggle(created.version.ingredients[0])
        #expect(model.checked.count == 1)
        model.rate(4)
        #expect(model.detail?.currentRating?.value == 4)
        model.move(to: folder.id)
        #expect(model.folderName == "Breakfast")
        model.setTags(["Quick"])
        #expect(model.detail?.tags == ["Quick"])
        model.archive()
        #expect(model.isArchived && model.isReadOnly)
        model.unarchive()
        #expect(!model.isReadOnly)
        let copy = try #require(model.duplicate())
        let past = RecipeDetailViewModel(environment: environment, recipeID: copy, versionNumber: 1)
        past.load()
        #expect(past.isReadOnly && past.detail?.version.version == 1)
        #expect(try environment.book.recipes.detail(created.id)?.recipe.currentVersion == 1, "none of that versioned")
    }
}
