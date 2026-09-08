import XCTest

/// End-to-end simulator checks behind `xcodebuild test`. M3 grows this into
/// the full create → search → archive → unarchive flow.
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

    /// Requirement 17.5: a damaged database is renamed aside, the newest
    /// verified snapshot restored, and a non-dismissable notice shown.
    func testCorruptDatabaseShowsRecoveryNoticeAndRestores() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--corrupt-db"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Your recipe book was recovered"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Export Damaged File"].exists)
        app.buttons["Continue"].tap()
        XCTAssertTrue(app.staticTexts["Kitchen Buddy"].waitForExistence(timeout: 5))

        app.buttons["settingsButton"].tap()
        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 5))
        app.staticTexts["Backups"].firstMatch.tap()
        let restored = app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH '34 recipes'")).firstMatch
        XCTAssertTrue(restored.waitForExistence(timeout: 5), "the 34 sample recipes came back from the snapshot")
        XCTAssertTrue(app.staticTexts["Damaged databases"].waitForExistence(timeout: 5))
    }

    /// Requirements 17.2, 18.4: Back Up Now produces a verified snapshot.
    func testBackUpNowAddsAVerifiedSnapshot() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--open", "backups"]
        app.launch()
        XCTAssertTrue(app.buttons["Back Up Now"].waitForExistence(timeout: 10))
        app.buttons["Back Up Now"].tap()
        XCTAssertTrue(app.staticTexts["Manual"].waitForExistence(timeout: 10))
        let verified = app.staticTexts.containing(NSPredicate(format: "label CONTAINS '34 recipes' AND label CONTAINS 'verified'")).firstMatch
        XCTAssertTrue(verified.waitForExistence(timeout: 5))
    }
}
