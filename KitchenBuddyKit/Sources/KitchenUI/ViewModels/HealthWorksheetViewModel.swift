import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// The worksheet: the live estimate for the current version with the
/// effective servings and the user's overrides, one auditable line per
/// ingredient, plus the actions that correct a line.
///
/// Requirements: kitchen-buddy-ios 21.3, 21.6
@MainActor @Observable
public final class HealthWorksheetViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public private(set) var detail: RecipeDetail?
    public private(set) var nutrition: RecipeNutrition?
    /// Recipe overrides layered over book-wide mappings.
    public private(set) var overrides: [String: Food.ID?] = [:]
    /// Keys with a recipe-level override (the rest of `overrides` are book-wide).
    public private(set) var recipeOverrideKeys: Set<String> = []
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        do {
            detail = try environment.book.recipes.detail(recipeID)
            nutrition = try environment.book.recipes.nutrition(recipeID)
            let recipeOverrides = FoodOverride.effective(try environment.book.recipes.foodOverrides(recipeID))
            recipeOverrideKeys = Set(recipeOverrides.keys)
            overrides = try environment.book.recipes.effectiveFoodChoices(recipeID)
        } catch {
            self.error = "\(error)"
        }
    }

    public var profiles: [HealthProfile] { environment.preferences.healthProfiles }
    public var scores: [HealthScore] { profiles.compactMap { nutrition?.score(for: $0) } }
    public var countedLines: [LineEstimate] { nutrition?.lines.filter { $0.status == .counted } ?? [] }
    public var uncountedLines: [LineEstimate] { nutrition?.uncountedLines ?? [] }

    public var servingsText: String {
        guard let detail else { return "" }
        switch (detail.version.servings, detail.effectiveServings) {
        case (nil, nil): return "No servings count — add one to score per serving"
        case (let own?, let got?) where own != got: return "Recipe says \(own) · you get \(got)"
        case (_, let got?): return "\(got) \(got == 1 ? "serving" : "servings")"
        default: return ""
        }
    }

    public var coverageText: String {
        guard let nutrition else { return "" }
        let counted = nutrition.countedLines, countable = nutrition.countableLines
        let percent = Int((nutrition.coverage * 100).rounded())
        var text = "\(counted) of \(countable) ingredient lines counted (\(percent)%)"
        if !nutrition.isSufficient { text += " — below \(Int(RecipeNutrition.minimumCoverage * 100))%, so no bands" }
        return text
    }

    /// The step from recipe total to badge: "Recipe total GL 67 ÷ 4 servings = 17".
    public func totalToServingText(_ profile: HealthProfile) -> String? {
        guard let nutrition else { return nil }
        let total: Double
        switch profile {
        case .diabetes: total = nutrition.totalGlycemicLoad
        case .bloodPressure: total = nutrition.totals.sodium
        case .heartHealth: total = nutrition.totals.saturatedFat
        }
        guard let servings = nutrition.effectiveServings, servings > 0, let per = nutrition.value(for: profile) else {
            return "Whole recipe \(profile.formatValue(total)) — add a servings count to divide it"
        }
        return "Whole recipe \(profile.formatValue(total)) ÷ \(servings) \(servings == 1 ? "serving" : "servings") = \(profile.formatValue(per)) each"
    }

    /// A line's share of one serving, nil without a servings count.
    public func perServing(_ value: Double) -> Double? {
        guard let servings = nutrition?.effectiveServings, servings > 0 else { return nil }
        return value / Double(servings)
    }

    /// Whole-recipe totals over the counted lines, with per-serving figures.
    public struct TotalRow: Hashable, Sendable {
        public var label: String
        public var total: String
        public var perServing: String?
    }

    public var totalRows: [TotalRow] {
        guard let nutrition else { return [] }
        var rows: [TotalRow] = []
        func row(_ label: String, _ total: Double, _ format: (Double) -> String) {
            rows.append(TotalRow(label: label, total: format(total), perServing: perServing(total).map(format)))
        }
        row("Carbohydrate", nutrition.totals.carbohydrate) { String(format: "%.0f g", $0) }
        row("Available carbohydrate", nutrition.totals.availableCarbohydrate) { String(format: "%.0f g", $0) }
        row("Glycemic load", nutrition.totalGlycemicLoad) { String(format: "%.1f", $0) }
        row("Sodium", nutrition.totals.sodium) { String(format: "%.0f mg", $0) }
        row("Saturated fat", nutrition.totals.saturatedFat) { String(format: "%.1f g", $0) }
        return rows
    }

    public func isOverridden(_ line: LineEstimate) -> Bool {
        overrides[FoodMatcher.normalize(line.ingredient.name)] != nil
    }

    /// The worksheet's own line "match" text.
    public func matchText(_ line: LineEstimate) -> String {
        guard let match = line.match else { return line.status.reason }
        switch match.source {
        case .keyword(let keyword): return "\(match.food.name) — matched “\(keyword)”"
        case .override:
            let scope = recipeOverrideKeys.contains(FoodMatcher.normalize(line.ingredient.name)) ? "this recipe only" : "everywhere"
            return "\(match.food.name) — your mapping, \(scope)"
        }
    }

    /// Book-wide by default (a wrong match is a data problem, not a recipe
    /// problem); `everywhere: false` keeps it to this recipe.
    public func choose(_ foodID: Food.ID?, for line: LineEstimate, everywhere: Bool = true) {
        perform {
            if everywhere {
                try $0.recipes.setFoodMapping(ingredientName: line.ingredient.name, foodID: foodID)
                if recipeOverrideKeys.contains(FoodMatcher.normalize(line.ingredient.name)) {
                    try $0.recipes.clearFoodOverride(recipeID, ingredientName: line.ingredient.name)
                }
            } else {
                try $0.recipes.setFoodOverride(recipeID, ingredientName: line.ingredient.name, foodID: foodID)
            }
        }
    }

    public func resetToAutomatic(_ line: LineEstimate) {
        perform {
            try $0.recipes.clearFoodOverride(recipeID, ingredientName: line.ingredient.name)
            try $0.recipes.clearFoodMapping(ingredientName: line.ingredient.name)
        }
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            load()
        } catch {
            self.error = "\(error)"
        }
    }
}
