import XCTest

/// End-to-end simulator checks behind `xcodebuild test`.
final class RecipeFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// Waits for the element to settle (search dismissal, scroll) and taps
    /// it; falls back to a centre-coordinate tap if XCTest still reports it
    /// unhittable while it is plainly on screen.
    /// Secondary toolbar items live behind the system "More" overflow.
    private func openOverflow(_ app: XCUIApplication) {
        let more = app.buttons["More"].firstMatch
        if more.waitForExistence(timeout: 3) { more.tap() }
    }

    private func tapWhenHittable(_ element: XCUIElement, timeout: TimeInterval = 5) {
        let deadline = Date().addingTimeInterval(timeout)
        while !element.isHittable && Date() < deadline { usleep(200_000) }
        if element.isHittable { element.tap() } else { element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
    }

    func testAppLaunchesToEmptyLibrary() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset"]
        app.launch()
        XCTAssertTrue(app.staticTexts["No recipes yet"].waitForExistence(timeout: 10))
    }

    /// Requirements 1.1–1.6, 2.1, 3.1–3.4, 6.1: create → edit → search →
    /// archive → unarchive, the M3 acceptance flow.
    func testCreateEditSearchArchiveUnarchive() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset"]
        app.launch()
        XCTAssertTrue(app.staticTexts["No recipes yet"].waitForExistence(timeout: 10))

        // Create
        app.buttons["addMenu"].tap()
        app.buttons["newRecipeMenuItem"].tap()
        let title = app.textFields["titleField"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        title.tap()
        title.typeText("Test Toast")
        let ingredient = app.textFields["ingredientName"].firstMatch
        ingredient.tap()
        ingredient.typeText("bread")
        let step = app.textViews["stepText"].firstMatch.exists ? app.textViews["stepText"].firstMatch : app.textFields["stepText"].firstMatch
        step.tap()
        step.typeText("Toast it.")
        XCTAssertTrue(app.buttons["saveButton"].isEnabled)
        app.buttons["saveButton"].tap()
        XCTAssertTrue(app.staticTexts["Test Toast"].waitForExistence(timeout: 5), "saving opens the new recipe")

        // Edit (a content change → version 2)
        app.buttons["editButton"].tap()
        let editTitle = app.textFields["titleField"]
        XCTAssertTrue(editTitle.waitForExistence(timeout: 5))
        editTitle.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
        editTitle.typeText(" Deluxe")
        app.buttons["saveButton"].tap()
        XCTAssertTrue(app.staticTexts["Test Toast Deluxe"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH 'Version 2'")).firstMatch.waitForExistence(timeout: 5), "content edit made version 2")

        // Search
        app.navigationBars.buttons.firstMatch.tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("delux")
        XCTAssertTrue(app.staticTexts["Test Toast Deluxe"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["1 recipe"].waitForExistence(timeout: 5))
        search.typeText("zzz")
        XCTAssertTrue(app.staticTexts["No matches"].waitForExistence(timeout: 5))
        app.buttons["Clear Filters"].tap()
        XCTAssertTrue(app.staticTexts["1 recipe"].waitForExistence(timeout: 5), "clearing filters returns to the full list")

        // Archive from Detail, then it is gone from the Library
        let row = app.cells.containing(NSPredicate(format: "label CONTAINS 'Test Toast Deluxe'")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5))
        tapWhenHittable(row)
        XCTAssertTrue(app.buttons["editButton"].waitForExistence(timeout: 5), "detail opened")
        openOverflow(app)
        XCTAssertTrue(app.buttons["Archive"].waitForExistence(timeout: 3))
        app.buttons["Archive"].tap()
        XCTAssertTrue(app.buttons["unarchiveButton"].waitForExistence(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.staticTexts["No recipes yet"].waitForExistence(timeout: 5))

        // Unarchive from the Archived screen
        openOverflow(app)
        app.buttons["Archived"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Test Toast Deluxe"].waitForExistence(timeout: 5))
        tapWhenHittable(app.cells.containing(NSPredicate(format: "label CONTAINS 'Test Toast Deluxe'")).firstMatch)
        app.buttons["unarchiveButton"].tap()
        XCTAssertTrue(app.buttons["editButton"].waitForExistence(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Test Toast Deluxe"].waitForExistence(timeout: 5))
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
        let firstRow = app.cells.containing(NSPredicate(format: "label CONTAINS 'BBQ Ribs'")).firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 10), "the sample recipes came back from the snapshot")
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
