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
    public private(set) var overrides: [String: Food.ID?] = [:]
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        do {
            detail = try environment.book.recipes.detail(recipeID)
            nutrition = try environment.book.recipes.nutrition(recipeID)
            overrides = FoodOverride.effective(try environment.book.recipes.foodOverrides(recipeID))
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

    public func isOverridden(_ line: LineEstimate) -> Bool {
        overrides[FoodMatcher.normalize(line.ingredient.name)] != nil
    }

    /// The worksheet's own line "match" text.
    public func matchText(_ line: LineEstimate) -> String {
        guard let match = line.match else { return line.status.reason }
        switch match.source {
        case .keyword(let keyword): return "\(match.food.name) — matched “\(keyword)”"
        case .override: return "\(match.food.name) — your choice"
        }
    }

    public func choose(_ foodID: Food.ID?, for line: LineEstimate) {
        perform { try $0.recipes.setFoodOverride(recipeID, ingredientName: line.ingredient.name, foodID: foodID) }
    }

    public func resetToAutomatic(_ line: LineEstimate) {
        perform { try $0.recipes.clearFoodOverride(recipeID, ingredientName: line.ingredient.name) }
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
