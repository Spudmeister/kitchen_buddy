import Testing
import SwiftUI
@testable import KitchenUI

@Suite struct RootViewTests {
    @Test @MainActor func rootViewBuilds() {
        _ = RootView().body
    }
}
