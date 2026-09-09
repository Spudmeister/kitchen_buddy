import KitchenCore
import KitchenPersistence
import KitchenUI
import SwiftUI

/// Composition root. Opens the recipe book (with the launch integrity
/// check), wires the environment, runs the snapshot policy on scene-phase
/// changes, and handles the launch arguments used by UI tests and
/// `scripts/screenshots.sh`:
///
/// - `--uitest-reset` — start from an empty container
/// - `--seed demo` — import `DemoRecipes.json` through the real import path;
///   `--seed-photos` additionally attaches generated photos to three recipes
/// - `--open settings|backups|archived` — start with that screen pushed
/// - `--open-recipe <title>` — start on that recipe's detail (`--edit` opens
///   its editor); `--search <text>` — start the Library with a search
/// - `--units original|us|metric`, `--default-servings <n>` — write those
///   preferences before the first screen (screenshots of settings in effect)
/// - `--stub-import` — URL import answers every fetch with an embedded
///   recipe page (UI test for the import flow, no network)
/// - `--corrupt-db` — seed, snapshot, then damage the database so launch
///   recovery runs (UI test for the recovery notice)
@main
struct KitchenBuddyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var environment: AppEnvironment?
    @State private var openError: String?
    private var initialRoutes: [Route]

    init() {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitest-reset") {
            Self.resetLocalData()
        }
        if arguments.contains("--corrupt-db") {
            Self.corruptDatabaseForTesting()
        }
        initialRoutes = Self.routes(from: arguments)

        do {
            let layout = try DatabaseStack.Layout.applicationSupport()
            let environment = try AppEnvironment.open(layout, sampleRecipes: Self.sampleRecipes)
            if Self.argumentValue("--seed", in: arguments) == "demo" {
                Self.seedDemoRecipes(into: environment)
            }
            if arguments.contains("--seed-photos") {
                DemoPhotos.seed(into: environment.book)
            }
            if arguments.contains("--stub-import") {
                environment.urlImporter = RecipeURLImporter { _ in
                    RecipeURLImporter.Page(data: Data(Self.stubRecipePage.utf8), status: 200, mimeType: "text/html", textEncodingName: "utf-8")
                }
            }
            if let importURL = Self.argumentValue("--open-import", in: arguments).flatMap(URL.init(string:)) {
                environment.router.present(.importURL(importURL))
            }
            if arguments.contains("--open-import-file") {
                // Export the current book to a temp file and open it for import
                // (screenshots + the import-review UI test, no Files picker).
                if let data = try? environment.book.exporter.exportData(.share(.all, includePhotos: false)) {
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent("Demo Export.kbrecipes")
                    try? data.write(to: url)
                    environment.router.present(.importFile(url))
                }
            }
            if arguments.contains("--open-share") {
                environment.router.present(.share(.all, backup: true))
            }
            if arguments.contains("--seed-perf") {
                Self.seedPerformanceRecipes(into: environment)
            }
            if let action = Self.argumentValue("--quick-action", in: arguments).flatMap(AppEnvironment.QuickAction.init(rawValue:)) {
                environment.pendingQuickAction = action
            }
            environment.feedbackURL = URL(string: "mailto:ace@puddleglum.net?subject=Kitchen%20Buddy%20feedback")
            environment.initialSearchText = Self.argumentValue("--search", in: arguments)
            if arguments.contains("--filter-demo") { environment.initialTokens = [.tag("chicken"), .maximumMinutes(45)] }
            if arguments.contains("--health-demo") {
                // Every profile on, and the Library filtered to diabetes-friendly.
                try? environment.updatePreferences { $0.enabledHealthProfiles = Set(HealthProfile.allCases) }
                if Self.argumentValue("--open-recipe", in: arguments) == nil { environment.initialTokens = [.friendly(.diabetes)] }
            }
            let units = Self.argumentValue("--units", in: arguments).flatMap(UnitPreference.init(rawValue:))
            let servings = Self.argumentValue("--default-servings", in: arguments).flatMap(Int.init)
            if units != nil || servings != nil {
                try? environment.updatePreferences {
                    if let units { $0.unitPreference = units }
                    if let servings { $0.defaultServings = servings }
                }
            }
            if let title = Self.argumentValue("--open-recipe", in: arguments),
               let match = try? environment.book.recipes.summaries(RecipeQuery(text: title)).first {
                initialRoutes = [.recipe(match.id)]
                switch Self.argumentValue("--open", in: arguments) {
                case "history": initialRoutes.append(.history(match.id))
                case "notes": initialRoutes.append(.notes(match.id))
                case "lineage": initialRoutes.append(.lineage(match.id))
                case "photos": initialRoutes.append(.photos(match.id))
                case "health": initialRoutes.append(.health(match.id))
                case "servings": environment.router.present(.servingsReport(match.id))
                default: break
                }
                if arguments.contains("--edit") { environment.router.present(.editRecipe(match.id)) }
            }
            _environment = State(initialValue: environment)
        } catch {
            _openError = State(initialValue: "\(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            if let environment {
                RootView(environment: environment, initialRoutes: initialRoutes)
            } else {
                ContentUnavailableView(
                    "Couldn't open your recipe book",
                    systemImage: "exclamationmark.triangle",
                    description: Text(openError ?? "Unknown error")
                )
            }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background: environment?.sceneDidEnterBackground()
            case .active:
                environment?.sceneDidBecomeActive()
                handlePendingQuickAction()
            default: break
            }
        }
        .onChange(of: appDelegate.shortcutType) { handlePendingQuickAction() }
    }

    /// Quick actions arrive through the app delegate (cold launch or while
    /// running) or a launch argument; hand them to the environment once.
    private func handlePendingQuickAction() {
        guard let environment else { return }
        if let type = appDelegate.shortcutType, let action = AppEnvironment.QuickAction(rawValue: type) {
            appDelegate.shortcutType = nil
            environment.pendingQuickAction = action
        }
        guard let action = environment.pendingQuickAction else { return }
        environment.pendingQuickAction = nil
        environment.perform(action, clipboardURL: UIPasteboard.general.url ?? UIPasteboard.general.string.flatMap { RecipeURLImporter.normalizedURL($0) })
    }

    /// A tiny schema.org page for the stubbed import.
    nonisolated private static let stubRecipePage = """
    <html><head><script type="application/ld+json">{"@type":"Recipe","name":"Stubbed Lemon Tart",
    "recipeYield":"8","prepTime":"PT30M","cookTime":"PT45M",
    "recipeIngredient":["1 1/2 cups flour","½ cup butter, cold","3 lemons, juiced","¾ cup sugar"],
    "recipeInstructions":[{"@type":"HowToStep","text":"Make the pastry."},{"@type":"HowToStep","text":"Fill and bake."}],
    "recipeCategory":"Dessert"}</script></head><body></body></html>
    """

    /// 5,100 recipes (the 34 samples × 150, titles suffixed) in one
    /// transaction, for the performance pass on a device or simulator.
    private static func seedPerformanceRecipes(into environment: AppEnvironment) {
        guard let data = sampleRecipes, let base = try? LegacyV1Reader.read(data),
              (try? environment.book.recipes.count(includeArchived: true)) ?? 0 < 1000 else { return }
        var drafts: [RecipeDraft] = []
        for round in 1...150 {
            for var draft in base {
                draft.content.title += " \(round)"
                drafts.append(draft)
            }
        }
        _ = try? environment.book.importDrafts(drafts)
    }

    private static var sampleRecipes: Data? {
        Bundle.main.url(forResource: "DemoRecipes", withExtension: "json").flatMap { try? Data(contentsOf: $0) }
    }

    private static func argumentValue(_ flag: String, in arguments: [String]) -> String? {
        guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(index + 1) else { return nil }
        return arguments[index + 1]
    }

    private static func routes(from arguments: [String]) -> [Route] {
        switch argumentValue("--open", in: arguments) {
        case "settings": return [.settings]
        case "backups": return [.settings, .backups]
        case "archived": return [.archived]
        case "folders": return [.folders]
        case "health-sources": return [.settings, .healthSources]
        default: return []
        }
    }

    /// UI tests start from an empty container. The only code path in the app
    /// that removes the database, and it is reachable only through a launch
    /// argument that TestFlight/App Store builds never receive.
    private static func resetLocalData() {
        guard let layout = try? DatabaseStack.Layout.applicationSupport() else { return }
        try? FileManager.default.removeItem(at: layout.root)
    }

    /// Loads the 34 sample recipes into an empty book (never on top of
    /// existing recipes, so a stray argument cannot duplicate a library).
    private static func seedDemoRecipes(into environment: AppEnvironment) {
        guard let data = sampleRecipes else { return }
        do {
            if try environment.book.recipes.count(includeArchived: true) == 0 {
                try environment.book.importLegacyV1(data)
            }
        } catch {
            assertionFailure("Demo seed failed: \(error)")
        }
    }

    /// Test-only: build a book with the samples, snapshot it, then zero the
    /// file header so the next open must recover from the snapshot.
    private static func corruptDatabaseForTesting() {
        guard let layout = try? DatabaseStack.Layout.applicationSupport(), let data = sampleRecipes else { return }
        do {
            let book = try RecipeBook.open(layout)
            try book.importLegacyV1(data)
            try book.backups.snapshot(reason: .manual)
            try book.close()
            // A WAL still holding page 1 would mask the damaged header.
            for suffix in ["-wal", "-shm"] {
                try? FileManager.default.removeItem(at: URL(fileURLWithPath: layout.databaseURL.path + suffix))
            }
            let handle = try FileHandle(forWritingTo: layout.databaseURL)
            try handle.seek(toOffset: 0)
            try handle.write(contentsOf: Data(repeating: 0, count: 100))
            try handle.close()
        } catch {
            assertionFailure("Corruption setup failed: \(error)")
        }
    }
}
