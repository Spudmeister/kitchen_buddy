import Testing
import SwiftUI
import KitchenTesting
@testable import KitchenUI

@Suite struct RootViewTests {
    @Test @MainActor func rootAndScreensBuild() {
        let environment = AppEnvironment.preview()
        _ = RootView(environment: environment).body
        _ = RootView(environment: environment, initialRoutes: [.settings, .backups]).body
        _ = SettingsView(environment: environment).body
        _ = BackupsView(environment: environment).body
        _ = RecoveryView(environment: environment).body
        #expect(!environment.isRecoveryPresented)
    }
}
