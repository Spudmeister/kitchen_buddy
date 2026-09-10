import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Settings screen state: preferences (saved on every change), the backup
/// summary line, and the maintenance actions.
///
/// Requirements: kitchen-buddy-ios 18.1–18.4
@MainActor @Observable
public final class SettingsViewModel {
    public let environment: AppEnvironment
    public var preferences: Preferences
    public private(set) var recipeCount = 0
    /// Book-wide food mappings currently in force.
    public private(set) var foodMappingCount = 0
    public private(set) var lastBackup: Snapshot?
    public private(set) var cloudStatus: CloudMirror.Status?
    public private(set) var isBusy = false
    public var message: String?

    public init(environment: AppEnvironment) {
        self.environment = environment
        preferences = environment.preferences
    }

    public var canLoadSamples: Bool { environment.sampleRecipes != nil && recipeCount == 0 && !isBusy }
    public var showsDeveloperOptions: Bool { AppEnvironment.showsDeveloperOptions }

    public var versionText: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "0"
        let build = info?["CFBundleVersion"] as? String ?? "0"
        return "\(version) (\(build))"
    }

    public var formatVersion: String { KitchenCore.exportFormatVersion }

    public func refresh() {
        recipeCount = (try? environment.book.recipes.count(includeArchived: true)) ?? 0
        foodMappingCount = FoodMapping.effective((try? environment.book.recipes.foodMappings()) ?? []).count
        lastBackup = try? environment.book.backups.snapshots().first { $0.isVerified }
        let cloud = environment.cloud
        Task {
            cloudStatus = await Task.detached(priority: .utility) { cloud.status() }.value
        }
    }

    /// Persists the bound preferences; called from `onChange`.
    public func save() {
        let updated = preferences
        do {
            try environment.updatePreferences { $0 = updated }
        } catch {
            message = "Couldn't save settings: \(error)"
            preferences = environment.preferences
        }
    }

    public func rebuildSearchIndex() async {
        await perform("Search index rebuilt.") { book in try book.rebuildSearchIndex() }
    }

    public func reindexSpotlight() async {
        isBusy = true
        defer { isBusy = false }
        let spotlight = environment.spotlight
        do {
            let count = try await spotlight.reindexAll(force: true)
            message = SpotlightIndexer.isAvailable ? "\(count) recipes indexed for Spotlight." : "Spotlight indexing isn't available on this device."
        } catch {
            message = "\(error)"
        }
    }

    /// Where beta feedback goes. Set by the host app; nil hides the row.
    public var feedbackURL: URL? { environment.feedbackURL }

    public func loadSampleRecipes() async {
        guard let data = environment.sampleRecipes else { return }
        await perform("Sample recipes loaded.") { book in
            guard try book.recipes.count(includeArchived: true) == 0 else { return }
            try book.importLegacyV1(data)
        }
    }

    private func perform(_ success: String, _ work: @escaping @Sendable (RecipeBook) throws -> Void) async {
        isBusy = true
        defer { isBusy = false }
        let book = environment.book
        do {
            try await Task.detached(priority: .userInitiated) { try work(book) }.value
            message = success
        } catch {
            message = "\(error)"
        }
        refresh()
    }
}
