import KitchenPersistence
import KitchenUI
import SwiftUI

/// Composition root. Opens the database stack, wires the stores into the
/// environment, and handles launch arguments used by UI tests and
/// `scripts/screenshots.sh` (`--uitest-reset`, `--seed demo`, ...).
@main
struct KitchenBuddyApp: App {
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("--uitest-reset") {
            Self.resetLocalData()
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
}
