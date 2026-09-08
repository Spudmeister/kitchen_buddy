import KitchenPersistence
import SwiftUI

/// The root `NavigationStack`. Still the bootstrap placeholder for the
/// Library (M3 replaces it) with Settings reachable from the toolbar and
/// the recovery notice presented over everything when launch recovered.
public struct RootView: View {
    @Bindable private var environment: AppEnvironment
    @State private var path: [Route]

    public init(environment: AppEnvironment, initialRoutes: [Route] = []) {
        self.environment = environment
        _path = State(initialValue: initialRoutes)
    }

    public var body: some View {
        NavigationStack(path: $path) {
            ContentUnavailableView(
                "Kitchen Buddy",
                systemImage: "book.closed",
                description: Text("Your recipe book is on its way.")
            )
            .navigationTitle("Recipes")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink(value: Route.settings) {
                        Label("Settings", systemImage: "gearshape")
                    }
                    .accessibilityIdentifier("settingsButton")
                }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .settings: SettingsView(environment: environment)
                case .backups: BackupsView(environment: environment)
                }
            }
        }
        .recoveryCover(isPresented: $environment.isRecoveryPresented) {
            RecoveryView(environment: environment)
        }
    }
}

private extension View {
    /// Full-screen on iOS; a non-dismissable sheet elsewhere (macOS builds
    /// exist only so the package compiles and tests headlessly).
    @ViewBuilder
    func recoveryCover<Content: View>(isPresented: Binding<Bool>, @ViewBuilder content: @escaping () -> Content) -> some View {
        #if os(iOS)
        fullScreenCover(isPresented: isPresented, content: content)
        #else
        sheet(isPresented: isPresented, content: content)
        #endif
    }
}

#Preview {
    RootView(environment: .preview())
}
