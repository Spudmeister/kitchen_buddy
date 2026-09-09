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

    /// Requirements 8.1–8.5, 9.3, 9.4, 18.2: Settings drive the detail
    /// screen; the stepper scales live; the unit control converts; a tap
    /// on the current star clears the rating.
    func testSettingsScaleUnitsAndClearRating() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--units", "metric", "--default-servings", "16", "--open-recipe", "Bruschetta"]
        app.launch()
        XCTAssertTrue(app.staticTexts["16 servings"].waitForExistence(timeout: 10), "opens at the default servings")
        XCTAssertTrue(app.staticTexts["Scale factor ×2"].exists, "8 → 16 is ×2")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'ml'")).firstMatch.exists, "metric by default")
        app.buttons["resetServings"].tap()
        XCTAssertTrue(app.staticTexts["8 servings"].waitForExistence(timeout: 5))

        let increment = app.buttons["Increment"].firstMatch.exists ? app.buttons["Increment"].firstMatch : app.steppers.firstMatch.buttons.element(boundBy: 1)
        increment.tap()
        XCTAssertTrue(app.staticTexts["9 servings"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Scale factor ×1⅛"].exists)
        app.segmentedControls["unitPicker"].buttons["As written"].tap()
        XCTAssertTrue(app.staticTexts["4½ pieces"].waitForExistence(timeout: 5), "4 tomatoes × 9/8 = 4½")

        let stars = app.otherElements["ratingStars"]
        XCTAssertTrue(stars.exists)
        XCTAssertEqual(stars.value as? String, "Not rated")
        stars.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.5)).tap()
        XCTAssertTrue(NSPredicate(format: "value CONTAINS 'of 5 stars'").evaluate(with: stars), "a star was set: \(stars.value ?? "")")
        stars.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.5)).tap()
        XCTAssertEqual(stars.value as? String, "Not rated", "the same star clears")
    }

    /// Requirements 1.2, 5.3, 5.4: reordering keeps the form in place and
    /// dietary suggestions are offered, applied only on accept.
    func testEditorReorderKeepsPlaceAndSuggestionsNeedAccept() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--open-recipe", "Bruschetta", "--edit"]
        app.launch()
        XCTAssertTrue(app.textFields["titleField"].waitForExistence(timeout: 10))
        // Bruschetta has no meat/dairy/gluten-free conflicts except the baguette (gluten) → vegan etc. offered.
        let suggestion = app.buttons["suggest-vegan"]
        app.swipeUp(); app.swipeUp(); app.swipeUp()
        XCTAssertTrue(suggestion.waitForExistence(timeout: 5), "vegan is suggested for bruschetta")
        suggestion.tap()
        XCTAssertFalse(app.buttons["suggest-vegan"].exists, "accepted suggestion leaves the list")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'vegan'")).firstMatch.exists)

        app.swipeDown(); app.swipeDown(); app.swipeDown()
        XCTAssertTrue(app.buttons["reorderIngredients"].waitForExistence(timeout: 5))
        // The Steps header sits below six two-line ingredient rows.
        let stepsToggle = app.buttons["reorderSteps"]
        var attempts = 0
        while !(stepsToggle.exists && stepsToggle.isHittable) && attempts < 10 {
            app.swipeUp(velocity: .slow)
            attempts += 1
        }
        stepsToggle.tap()
        let handles = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Reorder Step'"))
        XCTAssertTrue(handles.count >= 3, "step drag handles appear in reorder mode: \(handles.count)")
        var scrolls = 0
        while !(handles.element(boundBy: 2).isHittable && handles.element(boundBy: 0).isHittable) && scrolls < 6 {
            app.swipeUp(velocity: .slow)
            scrolls += 1
        }
        let first = app.textViews["stepText"].firstMatch.exists ? app.textViews["stepText"].firstMatch : app.textFields["stepText"].firstMatch
        let titleVisibleBefore = app.textFields["titleField"].isHittable
        handles.element(boundBy: 2).press(forDuration: 0.6, thenDragTo: handles.element(boundBy: 0))
        XCTAssertEqual(app.textFields["titleField"].isHittable, titleVisibleBefore, "the form did not jump")
        stepsToggle.tap()
        _ = first
        app.buttons["saveButton"].tap()
        XCTAssertTrue(app.staticTexts["Bruschetta"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH 'Step 1. Add olive oil'")).firstMatch.exists, "step 3 moved to the top")
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
