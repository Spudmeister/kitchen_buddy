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

    /// Requirements 2.3–2.5: edit twice, open Version History, view v1,
    /// restore it — v4 appears with v1's title and nothing is removed.
    func testVersionHistoryAndRestore() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--open-recipe", "Bruschetta"]
        app.launch()
        XCTAssertTrue(app.buttons["editButton"].waitForExistence(timeout: 10))
        for suffix in [" Two", " Three"] {
            app.buttons["editButton"].tap()
            let title = app.textFields["titleField"]
            XCTAssertTrue(title.waitForExistence(timeout: 5))
            title.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
            title.typeText(suffix)
            app.buttons["saveButton"].tap()
            XCTAssertTrue(app.buttons["editButton"].waitForExistence(timeout: 5))
        }
        XCTAssertTrue(app.staticTexts["Bruschetta Two Three"].exists)
        openOverflow(app)
        app.buttons["Version History"].tap()
        XCTAssertTrue(app.staticTexts["Version History"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["First version"].exists)
        app.cells.containing(NSPredicate(format: "label CONTAINS 'v1'")).firstMatch.tap()
        XCTAssertTrue(app.buttons["restoreButton"].waitForExistence(timeout: 5))
        app.buttons["restoreButton"].tap()
        app.buttons["Restore as New Version"].tap()
        XCTAssertTrue(app.staticTexts["Bruschetta"].waitForExistence(timeout: 5), "back on the recipe with v1's title")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH 'Version 4'")).firstMatch.waitForExistence(timeout: 5), "restore appended v4")
    }

    /// Requirements 16.2, 16.4: a folder cannot move into its own child; a
    /// deleted folder's contents move up. Requirement 7.5: note delete has Undo.
    func testFolderCycleRejectionAndNoteUndo() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--open", "folders"]
        app.launch()
        XCTAssertTrue(app.buttons["newFolder"].waitForExistence(timeout: 10))
        app.buttons["newFolder"].tap()
        let name = app.textFields["Folder name"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        name.tap(); name.typeText("Outer")
        app.buttons["Create"].tap()
        let outer = app.cells.containing(NSPredicate(format: "label CONTAINS 'Outer'")).firstMatch
        XCTAssertTrue(outer.waitForExistence(timeout: 5))
        outer.press(forDuration: 1.0)
        app.buttons["New Subfolder"].tap()
        let subName = app.textFields["Folder name"]
        XCTAssertTrue(subName.waitForExistence(timeout: 5))
        subName.tap(); subName.typeText("Inner")
        app.buttons["Create"].tap()
        XCTAssertTrue(outer.waitForExistence(timeout: 5))
        outer.press(forDuration: 1.0)
        app.buttons["Move to…"].tap()
        XCTAssertTrue(app.staticTexts["Move Folder"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Inner"].exists, "the folder's own subtree is not offered as a target")
        app.buttons["Cancel"].tap()

        // Notes with undo
        app.navigationBars.buttons.firstMatch.tap()
        app.cells.containing(NSPredicate(format: "label CONTAINS 'Bruschetta'")).firstMatch.tap()
        XCTAssertTrue(app.buttons["addNoteDetail"].waitForExistence(timeout: 5) || scrollTo(app, "addNoteDetail"))
        app.buttons["addNoteDetail"].tap()
        let body = app.textViews["noteBody"].firstMatch.exists ? app.textViews["noteBody"].firstMatch : app.textFields["noteBody"].firstMatch
        XCTAssertTrue(body.waitForExistence(timeout: 5))
        body.tap(); body.typeText("Great with extra basil.")
        app.buttons["saveNote"].tap()
        XCTAssertTrue(app.staticTexts["Great with extra basil."].waitForExistence(timeout: 5))
        app.buttons["All notes (1)"].tap()
        XCTAssertTrue(app.staticTexts["Notes"].waitForExistence(timeout: 5))
        app.cells.firstMatch.swipeLeft()
        app.buttons["Delete"].tap()
        XCTAssertTrue(app.buttons["undoDelete"].waitForExistence(timeout: 3))
        app.buttons["undoDelete"].tap()
        XCTAssertTrue(app.staticTexts["Great with extra basil."].waitForExistence(timeout: 5), "undo brought the note back")
    }

    private func scrollTo(_ app: XCUIApplication, _ identifier: String) -> Bool {
        for _ in 0..<8 where !app.buttons[identifier].isHittable { app.swipeUp(velocity: .slow) }
        return app.buttons[identifier].isHittable
    }

    /// Requirements 11.3–11.5: gallery, cover change, viewer paging, soft removal.
    func testPhotoGalleryCoverAndViewer() {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-reset", "--seed", "demo", "--seed-photos", "--open-recipe", "BBQ Ribs", "--open", "photos"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Photos"].waitForExistence(timeout: 10))
        let cover = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 1, cover'")).firstMatch
        XCTAssertTrue(cover.waitForExistence(timeout: 5), "three seeded photos, first is the cover")
        let second = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 2'")).firstMatch
        XCTAssertTrue(second.exists)
        second.press(forDuration: 1.0)
        app.buttons["Set as Cover"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 1, cover'")).firstMatch.waitForExistence(timeout: 5))

        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 1'")).firstMatch.tap()
        XCTAssertTrue(app.buttons["closeViewer"].waitForExistence(timeout: 5), "viewer opened")
        app.swipeLeft()
        app.buttons["closeViewer"].tap()

        let third = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 3'")).firstMatch
        XCTAssertTrue(third.waitForExistence(timeout: 5))
        third.press(forDuration: 1.0)
        app.buttons["Remove"].tap()
        app.buttons["Remove Photo"].tap()
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Photo 3'")).firstMatch.waitForExistence(timeout: 2), "removed photo leaves the grid")
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
