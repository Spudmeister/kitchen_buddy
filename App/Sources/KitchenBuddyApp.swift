import KitchenPersistence
import KitchenUI
import SwiftUI

/// Composition root. Opens the recipe book (with the launch integrity
/// check), wires the environment, runs the snapshot policy on scene-phase
/// changes, and handles the launch arguments used by UI tests and
/// `scripts/screenshots.sh`:
///
/// - `--uitest-reset` — start from an empty container
/// - `--seed demo` — import `DemoRecipes.json` through the real import path
/// - `--open settings|backups` — start with that screen pushed
/// - `--corrupt-db` — seed, snapshot, then damage the database so launch
///   recovery runs (UI test for the recovery notice)
@main
struct KitchenBuddyApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var environment: AppEnvironment?
    @State private var openError: String?
    private let initialRoutes: [Route]

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
            case .active: environment?.sceneDidBecomeActive()
            default: break
            }
        }
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
