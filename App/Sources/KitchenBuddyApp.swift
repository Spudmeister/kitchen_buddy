import KitchenPersistence
import KitchenUI
import SwiftUI

/// Composition root. Opens the recipe book and handles the launch arguments
/// used by UI tests and `scripts/screenshots.sh`:
///
/// - `--uitest-reset` — start from an empty container
/// - `--seed demo` — import `DemoRecipes.json` through the real import path
///
/// M3 wires the stores into the environment behind the Library screen.
@main
struct KitchenBuddyApp: App {
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitest-reset") {
            Self.resetLocalData()
        }
        if let index = arguments.firstIndex(of: "--seed"), arguments.indices.contains(index + 1),
           arguments[index + 1] == "demo" {
            Self.seedDemoRecipes()
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
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
    private static func seedDemoRecipes() {
        guard let layout = try? DatabaseStack.Layout.applicationSupport(),
              let url = Bundle.main.url(forResource: "DemoRecipes", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return }
        do {
            let book = try RecipeBook.open(layout)
            defer { try? book.close() }
            if try book.recipes.count(includeArchived: true) == 0 {
                try book.importLegacyV1(data)
            }
        } catch {
            assertionFailure("Demo seed failed: \(error)")
        }
    }
}
