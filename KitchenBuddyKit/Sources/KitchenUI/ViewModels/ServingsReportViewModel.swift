import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// "Servings you get": a count and note appended as a serving report, or
/// a reset to the recipe's own count; the history stays visible.
///
/// Requirements: kitchen-buddy-ios 20.1–20.4
@MainActor @Observable
public final class ServingsReportViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public private(set) var recipeServings: Int?
    public private(set) var currentReport: ServingReport?
    public private(set) var history: [ServingReport] = []
    public var servings: Int = 4
    public var note = ""
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        do {
            let detail = try environment.book.recipes.detail(recipeID)
            recipeServings = detail?.version.servings
            currentReport = detail?.latestServingReport
            history = try environment.book.recipes.servingReports(recipeID).reversed()
            servings = detail?.effectiveServings ?? 4
        } catch {
            self.error = "\(error)"
        }
    }

    public var effectiveServings: Int? { currentReport?.servings ?? recipeServings }
    public var isOverridden: Bool { currentReport?.servings != nil && currentReport?.servings != recipeServings }
    public var canSave: Bool { (1...999).contains(servings) && servings != effectiveServings || !note.trimmingCharacters(in: .whitespaces).isEmpty }

    @discardableResult
    public func save() -> Bool {
        do {
            try environment.book.recipes.reportServings(recipeID, servings: servings, note: note)
            load()
            note = ""
            return true
        } catch {
            self.error = "\(error)"
            return false
        }
    }

    /// Appends a nil report: back to the recipe's own count (20.2).
    @discardableResult
    public func useRecipeCount() -> Bool {
        do {
            try environment.book.recipes.reportServings(recipeID, servings: nil, note: nil)
            load()
            return true
        } catch {
            self.error = "\(error)"
            return false
        }
    }
}
