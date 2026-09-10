import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Recipe Detail state for the current version (or a chosen past version,
/// read-only). Ingredient checks, the servings scale, and the unit choice
/// are view state: they never touch the stored recipe. The initial servings
/// and unit system come from Settings.
///
/// Requirements: kitchen-buddy-ios 3.1, 3.4, 8.1–8.5, 9.3, 9.4, 10.1–10.3, 15.1–15.3, 18.2
@MainActor @Observable
public final class RecipeDetailViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    /// A past version to show read-only; nil for the current one.
    public let versionNumber: Int?
    public private(set) var detail: RecipeDetail?
    public private(set) var folderName: String?
    public private(set) var isMissing = false
    public var checked: Set<Ingredient.ID> = []
    public var error: String?
    /// Servings currently displayed; nil until loaded or when the recipe has none.
    public var servings: Int?
    /// Display-only unit choice, seeded from Settings and never written back.
    public var unitPreference: UnitPreference
    public var isServingsEntryPresented = false
    public var servingsEntryText = ""
    /// Bumps on every saved rating so the view can play haptic feedback (15.5).
    public private(set) var ratingFeedbackTrigger = 0
    public private(set) var heritage: RecipeHeritage?
    private var loadedBase: Int?

    public init(environment: AppEnvironment, recipeID: Recipe.ID, versionNumber: Int? = nil) {
        self.environment = environment
        self.recipeID = recipeID
        self.versionNumber = versionNumber
        unitPreference = environment.preferences.unitPreference
    }

    // MARK: Scaling and units

    /// The scaling base: the latest "servings you get" report, else the
    /// recipe's own count (Requirement 20.3).
    public var baseServings: Int? { detail?.effectiveServings }
    /// Enabled profiles with the stored per-serving score (Requirement 21.6).
    public var healthScores: [HealthScore] {
        guard let health = summaryHealth else { return [] }
        return environment.preferences.healthProfiles.map(health.score(for:))
    }
    public private(set) var summaryHealth: RecipeHealth?
    /// "Recipe says 8 · you get 4" when a report differs from the recipe.
    public var servingsChipText: String? {
        guard let detail else { return nil }
        let own = detail.version.servings
        let effective = detail.effectiveServings
        switch (own, effective) {
        case (nil, nil): return nil
        case (let own?, let got?) where own != got: return "Recipe says \(own) · you get \(got)"
        case (_, let got?): return "\(got) \(got == 1 ? "serving" : "servings")"
        default: return nil
        }
    }
    /// Scaling needs a servings value on the recipe (Requirement 8.4).
    public var canScale: Bool { baseServings != nil }
    public var scaleFactor: Fraction {
        guard let servings, let factor = Scaler.factor(from: baseServings, to: servings) else { return .one }
        return factor
    }
    public var isScaled: Bool { scaleFactor != .one }
    public var scaleFactorText: String { "×\(QuantityFormatter.string(for: scaleFactor))" }

    /// Ingredients scaled exactly, converted to the chosen system, rounded
    /// to practical measures.
    public var displayedIngredients: [Ingredient] {
        guard let detail else { return [] }
        return QuantityPipeline.prepare(detail.version.ingredients, factor: scaleFactor, preference: unitPreference)
    }

    public func setServings(_ value: Int) {
        guard canScale else { return }
        servings = min(max(1, value), 999)
    }

    public func resetServings() { servings = baseServings }

    public func beginServingsEntry() {
        servingsEntryText = servings.map(String.init) ?? ""
        isServingsEntryPresented = true
    }

    public func commitServingsEntry() {
        if let value = Int(servingsEntryText.trimmingCharacters(in: .whitespaces)) { setServings(value) }
        isServingsEntryPresented = false
    }

    public var isArchived: Bool { detail?.recipe.isArchived == true }
    public var isPastVersion: Bool { versionNumber != nil }
    /// Archived recipes and past versions are read-only.
    public var isReadOnly: Bool { isArchived || isPastVersion }

    public func load() {
        do {
            let book = environment.book
            detail = try versionNumber.map { try book.recipes.detail(recipeID, version: $0) } ?? (try book.recipes.detail(recipeID))
            isMissing = detail == nil
            folderName = try detail?.recipe.folderID.flatMap { try book.folders.folder($0) }?.name
            heritage = try book.recipes.heritage(recipeID)
            summaryHealth = try book.recipes.summary(recipeID)?.health
            let base = detail?.effectiveServings
            if servings == nil, let base {
                // Settings › default servings opens scaled (Requirement 18.2).
                servings = environment.preferences.defaultServings ?? base
            }
            // A new serving report moves the base; follow it unless the user has scaled.
            if let base, let previous = loadedBase, previous != base, servings == previous { servings = base }
            loadedBase = base
        } catch {
            self.error = "\(error)"
        }
    }

    public func toggle(_ ingredient: Ingredient) {
        if !checked.insert(ingredient.id).inserted { checked.remove(ingredient.id) }
    }

    /// Tapping the current star clears; anything else rates.
    public func rate(_ value: Int) {
        if detail?.currentRating?.value == value {
            clearRating()
        } else {
            perform { try $0.recipes.rate(recipeID, value: value) }
            ratingFeedbackTrigger += 1
        }
    }

    public func clearRating() {
        perform { try $0.recipes.clearRating(recipeID) }
        ratingFeedbackTrigger += 1
    }

    /// Restore this past version as a new current version (2.5).
    @discardableResult
    public func restoreThisVersion() -> Bool {
        guard let number = versionNumber else { return false }
        do {
            _ = try environment.book.recipes.restore(recipeID, toVersion: number)
            return true
        } catch {
            self.error = "\(error)"
            return false
        }
    }

    public var hasLineage: Bool { heritage.map { $0.parent != nil || !$0.children.isEmpty } ?? false }

    public func archive() {
        perform { try $0.recipes.archive(recipeID) }
        environment.spotlightUpdate(recipeID)
    }

    public func unarchive() {
        perform { try $0.recipes.unarchive(recipeID) }
        environment.spotlightUpdate(recipeID)
    }

    @discardableResult
    public func duplicate() -> Recipe.ID? {
        do {
            return try environment.book.recipes.duplicate(recipeID).id
        } catch {
            self.error = "\(error)"
            return nil
        }
    }

    public func setTags(_ tags: [String]) {
        perform { try $0.recipes.setTags(tags, for: recipeID) }
    }

    public func move(to folderID: Folder.ID?) {
        perform { try $0.recipes.move(recipeID, toFolder: folderID) }
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
