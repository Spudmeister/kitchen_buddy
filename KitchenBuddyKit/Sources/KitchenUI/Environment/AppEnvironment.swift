import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// What every screen shares: the open recipe book, the iCloud mirror, the
/// current preferences, and the launch report. Also runs the snapshot
/// policy on scene-phase changes. M3 adds the router.
///
/// Requirements: kitchen-buddy-ios 17.2, 17.5, 17.6, 18.3
@MainActor @Observable
public final class AppEnvironment {
    public let book: RecipeBook
    public let cloud: CloudMirror
    public private(set) var preferences: Preferences
    public let launchReport: LaunchReport
    /// The non-dismissable recovery notice (Requirement 17.5).
    public var isRecoveryPresented: Bool
    /// The sample-recipe JSON, when the host bundles it.
    public var sampleRecipes: Data?
    /// Last error from background maintenance, for Settings to surface.
    public private(set) var maintenanceError: String?
    /// Bumped when background maintenance finishes so screens re-read
    /// backup and iCloud status.
    public private(set) var maintenanceGeneration = 0
    /// Navigation state shared by every screen.
    public let router = Router()
    /// Search text to start the Library with (screenshots, UI tests).
    public var initialSearchText: String?
    /// URL import; the host may swap the fetcher (UI tests use a stub).
    public var urlImporter = RecipeURLImporter()
    /// The Share Extension's queue.
    public var shareInbox = ShareInbox()
    /// Set by the Detail overflow "Share…" item; the Detail view presents
    /// the share sheet with its current scale and units.
    public var detailShareRequest: Recipe.ID?

    public init(book: RecipeBook, cloud: CloudMirror, sampleRecipes: Data? = nil) {
        self.book = book
        self.cloud = cloud
        self.sampleRecipes = sampleRecipes
        preferences = (try? book.preferences.load()) ?? .default
        launchReport = book.launchReport
        isRecoveryPresented = book.launchReport.needsAttention
    }

    /// The production environment over the Application Support layout.
    public static func open(_ layout: DatabaseStack.Layout, sampleRecipes: Data? = nil) throws -> AppEnvironment {
        AppEnvironment(book: try RecipeBook.open(layout), cloud: CloudMirror(layout: layout), sampleRecipes: sampleRecipes)
    }

    /// In-memory book with a temporary "cloud" directory, for previews.
    public static func preview() -> AppEnvironment {
        // swiftlint:disable:next force_try
        let book = try! RecipeBook.openInMemory()
        let container = book.layout.root.appendingPathComponent("cloud", isDirectory: true)
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { container }))
    }

    /// Developer conveniences (sample recipes) show in Debug and TestFlight
    /// builds, never in App Store builds.
    public static var showsDeveloperOptions: Bool {
        #if DEBUG
        return true
        #else
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #endif
    }

    // MARK: Preferences

    /// Applies and persists a change immediately (Requirement 18.3).
    public func updatePreferences(_ change: (inout Preferences) -> Void) throws {
        var updated = preferences
        change(&updated)
        guard updated != preferences else { return }
        try book.preferences.save(updated)
        preferences = updated
    }

    /// Re-reads preferences after a restore replaced the database.
    public func reloadPreferences() {
        preferences = (try? book.preferences.load()) ?? .default
    }

    // MARK: Scene phases

    public func sceneDidEnterBackground() {
        runMaintenance(.background)
    }

    public func sceneDidBecomeActive() {
        runMaintenance(.daily)
        drainShareInbox()
    }

    /// Opens the import sheet for the next URL the Share Extension queued (12.5).
    public func drainShareInbox() {
        guard router.presented == nil, let url = shareInbox.takeNext() else { return }
        router.present(.importURL(url))
    }

    /// `kitchenbuddy://recipe/<id>`, `kitchenbuddy://import?url=…`, and
    /// `.kbrecipes` / `.json` files opened from Files, AirDrop, Mail (19.4).
    public func open(_ url: URL) {
        if url.isFileURL {
            router.present(.importFile(url))
            return
        }
        guard url.scheme == "kitchenbuddy" else { return }
        switch url.host {
        case "recipe":
            let id = url.lastPathComponent
            if !id.isEmpty, (try? book.recipes.detail(Recipe.ID(id))) != nil { router.showRecipe(Recipe.ID(id)) }
        case "import":
            let target = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "url" }?.value.flatMap(URL.init(string:))
            router.present(.importURL(target))
        default:
            break
        }
    }

    /// Snapshot if due, then mirror the newest verified snapshot to iCloud
    /// when the preference is on. Off the main thread; errors are recorded,
    /// never thrown at the user.
    private func runMaintenance(_ trigger: BackupManager.Trigger) {
        let book = book
        let cloud = cloud
        let mirrorEnabled = preferences.iCloudBackupEnabled
        Task {
            let failure: String? = await Task.detached(priority: .utility) {
                do {
                    try book.backups.snapshotIfDue(trigger)
                    if mirrorEnabled, let newest = try book.backups.newestVerified() {
                        try cloud.mirror(newest)
                    }
                    return nil
                } catch {
                    return "\(error)"
                }
            }.value
            maintenanceError = failure
            maintenanceGeneration += 1
        }
    }
}
