import XCTest

/// End-to-end simulator check behind `xcodebuild test`. M2 grows this into
/// the full create → search → scale → note → archive → unarchive flow.
final class RecipeFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testAppLaunchesToPlaceholder() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Kitchen Buddy"].waitForExistence(timeout: 10))
    }
}
