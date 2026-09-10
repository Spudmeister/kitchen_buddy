import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios M11 view models over the store: the worksheet
/// reflects overrides, the servings sheet moves the detail's base and the
/// badges, the Library's friendly chip filters, and the profile switches
/// persist.
/// Validates: Requirements 20.1–20.3, 21.6–21.8, 18.3
@Suite struct HealthViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let book = try TestDatabase.inMemory()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    static let loaf = RecipeDraft(title: "Loaf", ingredients: [
        IngredientDraft(name: "bread flour", quantity: Fraction(500), unit: .g),
        IngredientDraft(name: "water", quantity: Fraction(350), unit: .ml),
        IngredientDraft(name: "salt", quantity: Fraction(10), unit: .g),
        IngredientDraft(name: "mystery powder", quantity: Fraction(1), unit: .cup),
    ], instructions: [InstructionDraft(text: "Bake.")], servings: 12)

    @Test @MainActor func worksheetOverridesAndServingsReports() throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.loaf)

        let sheet = HealthWorksheetViewModel(environment: environment, recipeID: created.id)
        sheet.load()
        #expect(sheet.servingsText == "12 servings")
        #expect(sheet.countedLines.count == 3 && sheet.uncountedLines.count == 1)
        #expect(sheet.coverageText.hasPrefix("3 of 4"))
        #expect(sheet.scores.map(\.profile) == HealthProfile.allCases, "every profile is on by default")
        #expect(sheet.scores[0].band == .unknown, "75% coverage is below the bar")

        // The per-serving math is spelled out (Andrew, 2026-09-10: "it doesn't show the per person math").
        let flourLine = try #require(sheet.countedLines.first)
        #expect(abs((sheet.perServing(flourLine.glycemicLoad ?? 0) ?? 0) - (flourLine.glycemicLoad ?? 0) / 12) < 1e-9)
        #expect(sheet.totalToServingText(.diabetes)?.hasPrefix("Whole recipe ") == true)
        #expect(sheet.totalToServingText(.diabetes)?.contains("÷ 12 servings = ") == true, "\(sheet.totalToServingText(.diabetes) ?? "")")
        #expect(sheet.totalRows.map(\.label) == ["Carbohydrate", "Available carbohydrate", "Glycemic load", "Sodium", "Saturated fat"])
        #expect(sheet.totalRows.allSatisfy { $0.perServing != nil })

        let mystery = try #require(sheet.uncountedLines.first)
        sheet.choose("flour-white", for: mystery)
        #expect(sheet.countedLines.count == 4 && sheet.isOverridden(sheet.countedLines[3]))
        #expect(sheet.matchText(sheet.countedLines[3]).hasSuffix("your mapping, everywhere"))
        #expect(try environment.book.recipes.foodMappings().count == 1, "book-wide by default")
        let second = try environment.book.recipes.create(Self.loaf)
        #expect(try environment.book.recipes.nutrition(second.id)?.lines[3].match?.food.id == "flour-white", "another recipe gets it too")
        sheet.choose("flour-whole-wheat", for: sheet.countedLines[3], everywhere: false)
        #expect(sheet.matchText(sheet.countedLines[3]).hasSuffix("this recipe only"))
        #expect(try environment.book.recipes.nutrition(second.id)?.lines[3].match?.food.id == "flour-white", "the other recipe keeps the mapping")
        let mappings = FoodMappingsViewModel(environment: environment)
        mappings.load()
        #expect(mappings.entries.map(\.ingredientKey) == ["mystery powder"] && mappings.entries[0].food?.id == "flour-white")
        mappings.resetToAutomatic(mappings.entries[0])
        #expect(mappings.entries.isEmpty)
        #expect(try environment.book.recipes.nutrition(second.id)?.lines[3].status == .unmatched)
        #expect(sheet.countedLines.count == 4, "the recipe-only override survives the reset")
        sheet.resetToAutomatic(sheet.countedLines[3])
        #expect(sheet.uncountedLines.first?.status == .unmatched)
        sheet.choose("flour-white", for: sheet.uncountedLines[0])
        #expect(sheet.scores[0].band == .high, "\(sheet.scores[0])")
        sheet.choose(nil, for: sheet.countedLines[3])
        #expect(sheet.uncountedLines.first?.status == .excluded && sheet.scores[0].band == .high, "excluded lines don't hurt coverage")
        sheet.resetToAutomatic(sheet.uncountedLines[0])
        #expect(sheet.uncountedLines.first?.status == .unmatched && sheet.scores[0].band == .unknown)

        let detail = RecipeDetailViewModel(environment: environment, recipeID: created.id)
        detail.load()
        #expect(detail.baseServings == 12 && detail.servings == 12 && detail.servingsChipText == "12 servings")
        let servings = ServingsReportViewModel(environment: environment, recipeID: created.id)
        servings.load()
        #expect(servings.servings == 12 && !servings.isOverridden)
        servings.servings = 6
        servings.note = "thick slices"
        #expect(servings.canSave && servings.save())
        #expect(servings.isOverridden && servings.history.count == 1 && servings.history[0].note == "thick slices")
        detail.load()
        #expect(detail.baseServings == 6 && detail.servings == 6, "the base follows the report")
        #expect(detail.servingsChipText == "Recipe says 12 · you get 6")
        detail.setServings(24)
        #expect(detail.scaleFactor == Fraction(4), "scaling works from the servings you get")
        #expect(servings.useRecipeCount())
        detail.load()
        #expect(detail.baseServings == 12 && detail.servings == 24, "a user-scaled view keeps its number")
        #expect(try environment.book.recipes.servingReports(created.id).count == 2)
    }

    @Test @MainActor func friendlyChipFiltersAndProfilesPersist() throws {
        let environment = try Self.environment()
        let salad = try environment.book.recipes.create(RecipeDraft(title: "Green Salad", ingredients: [
            IngredientDraft(name: "lettuce", quantity: Fraction(1), unit: .piece),
            IngredientDraft(name: "olive oil", quantity: Fraction(2), unit: .tbsp),
        ], instructions: [InstructionDraft(text: "Toss.")], servings: 4))
        _ = try environment.book.recipes.create(Self.loaf)
        try environment.book.recipes.setFoodOverride(salad.id, ingredientName: "lettuce", foodID: "lettuce")

        let library = LibraryViewModel(environment: environment)
        library.start()
        defer { library.stop() }
        #expect(library.healthChips.map(\.id) == ["friendly:diabetes", "friendly:bloodPressure", "friendly:heartHealth"])
        library.toggle(.friendly(.diabetes))
        library.refreshResults()
        #expect(library.results.map(\.id) == [salad.id], "\(library.results.map(\.title))")
        #expect(library.results[0].health?.band(for: .diabetes) == .low)
        library.toggle(.friendly(.diabetes))
        library.refreshResults()
        #expect(library.results.count == 2)

        let settings = SettingsViewModel(environment: environment)
        settings.refresh()
        settings.preferences.enabledHealthProfiles = [.diabetes, .bloodPressure]
        settings.save()
        #expect(environment.preferences.healthProfiles == [.diabetes, .bloodPressure])
        #expect(try environment.book.preferences.load().enabledHealthProfiles == [.diabetes, .bloodPressure])
        #expect(library.healthChips.count == 2)
        settings.preferences.enabledHealthProfiles = []
        settings.save()
        #expect(try environment.book.preferences.load().enabledHealthProfiles.isEmpty, "empty is stored, not defaulted")
        #expect(library.healthChips.isEmpty)
        let detail = RecipeDetailViewModel(environment: environment, recipeID: salad.id)
        detail.load()
        #expect(detail.healthScores.isEmpty, "no profile, no badge")
    }
}
