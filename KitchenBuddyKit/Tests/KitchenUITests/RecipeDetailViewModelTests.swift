import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, Detail display state: scaling, units, and
/// rating at the view-model level (P7, P9, P11 as the screen sees them).
/// Validates: Requirements 8.1–8.5, 9.3, 9.4, 15.1–15.3, 18.2
@Suite struct RecipeDetailViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let book = try TestDatabase.inMemory()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    static let draft = RecipeDraft(
        title: "Pancakes",
        ingredients: [IngredientDraft(name: "flour", quantity: Fraction(3, 2), unit: .cup),
                      IngredientDraft(name: "milk", quantity: Fraction(1), unit: .cup),
                      IngredientDraft(name: "eggs", quantity: Fraction(2), unit: .piece),
                      IngredientDraft(name: "salt", unit: .toTaste)],
        instructions: [InstructionDraft(text: "Mix.")], servings: 4)

    @Test @MainActor func scalingIsExactAndDisplayOnly() throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.draft)
        let model = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        model.load()
        #expect(model.servings == 4 && model.canScale && !model.isScaled)

        model.setServings(6)
        #expect(model.scaleFactor == Fraction(3, 2) && model.scaleFactorText == "×1½")
        let shown = model.displayedIngredients
        #expect(shown[0].quantity == Fraction(9, 4), "1½ cups × 3/2 = 2¼, already practical")
        #expect(shown[1].quantity == Fraction(3, 2))
        #expect(shown[2].quantity == Fraction(3))
        #expect(shown[3].quantity == nil, "to taste never gets a number")
        model.setServings(0)
        #expect(model.servings == 1, "clamped")
        model.resetServings()
        #expect(!model.isScaled && model.displayedIngredients.map(\.quantity) == created.version.ingredients.map(\.quantity))
        #expect(try environment.book.recipes.detail(created.id)?.recipe.currentVersion == 1, "scaling never touches the recipe")

        model.servingsEntryText = "12"
        model.commitServingsEntry()
        #expect(model.servings == 12 && model.scaleFactor == Fraction(3))
    }

    @Test @MainActor func settingsSeedServingsAndUnits() throws {
        let environment = try Self.environment()
        try environment.updatePreferences { $0.defaultServings = 6; $0.unitPreference = .metric }
        let created = try environment.book.recipes.create(Self.draft)
        let model = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        model.load()
        #expect(model.servings == 6 && model.isScaled, "opens at the default servings (18.2)")
        #expect(model.unitPreference == .metric)
        let shown = model.displayedIngredients
        #expect(shown[0].unit == .g, "flour has a density: cups become grams")
        #expect(shown[1].unit == .ml, "milk stays on volume")
        #expect(shown[2].unit == .piece && shown[3].unit == .toTaste, "others pass through")

        model.unitPreference = .us
        #expect(model.displayedIngredients[0].unit?.system == .us)
        #expect(environment.preferences.unitPreference == .metric, "a per-screen change never writes the preference (9.3)")

        let noServings = try environment.book.recipes.create(RecipeDraft(title: "Salt", ingredients: [IngredientDraft(name: "salt")], instructions: [InstructionDraft(text: "x")]))
        let model2 = RecipeDetailViewModel(environment: environment, recipeID: noServings.id)
        model2.load()
        #expect(!model2.canScale && model2.servings == nil, "no servings value → scaling disabled (8.4)")
        model2.setServings(3)
        #expect(model2.servings == nil)
    }

    /// P11 at the view-model level: every convertible ingredient displays in
    /// the chosen system, everything else passes through, for random recipes
    /// and factors; the unrounded scaled value is exactly q × t/b (P7).
    @Test @MainActor
    func unitPreferenceAndScalingHoldForRandomRecipes() throws {
        let environment = try Self.environment()
        for seed in UInt64(0)..<100 { try Self.checkRandomRecipe(seed: seed, in: environment) }
    }

    @MainActor
    static func checkRandomRecipe(seed: UInt64, in environment: AppEnvironment) throws {
        var rng = SeededRandomSource(seed: seed)
        let created = try environment.book.recipes.create(RecipeGen.draft.run(&rng))
        let model = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        model.load()
        guard let base = created.version.servings else {
            #expect(!model.canScale, "seed \(seed)")
            return
        }
        let target = Int.random(in: 1...20, using: &rng)
        model.setServings(target)
        model.unitPreference = Gen<UnitPreference>.element(of: UnitPreference.allCases).run(&rng)
        #expect(model.scaleFactor == Fraction(target, base), "seed \(seed)")
        for (original, shown) in zip(created.version.ingredients, model.displayedIngredients) {
            let expected = QuantityPipeline.prepare(original, factor: Fraction(target, base), preference: model.unitPreference)
            #expect(shown == expected, "seed \(seed)")
            if let unit = original.unit, unit.isConvertible, original.quantity != nil, let system = model.unitPreference.system {
                #expect(shown.unit?.system == system, "seed \(seed)")
            } else {
                #expect(shown.unit == original.unit, "seed \(seed)")
            }
        }
    }

    @Test @MainActor func tappingTheCurrentStarClears() throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.draft)
        let model = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        model.load()
        model.rate(4)
        #expect(model.detail?.currentRating?.value == 4)
        model.rate(4)
        #expect(model.detail?.currentRating == nil, "same star again clears")
        #expect(try environment.book.recipes.ratings(created.id).map(\.value) == [4], "history kept")
        #expect(try environment.book.recipes.ratingEvents(created.id).map(\.value) == [4, nil])
        model.rate(2)
        #expect(model.detail?.currentRating?.value == 2)
        model.clearRating()
        #expect(model.detail?.currentRating == nil)
        #expect(try environment.book.recipes.summaries(.all).first?.latestRating == nil)
    }
}
