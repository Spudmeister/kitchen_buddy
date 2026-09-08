import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, RecipeStore behaviour by example.
/// Validates: Requirements 1.4, 1.6, 2.1, 2.2, 2.5, 3.1–3.4, 4.1, 7.1–7.5, 15.1
@Suite struct RecipeStoreTests {
    let book = try! TestDatabase.inMemory()

    var toast: RecipeDraft {
        RecipeDraft(title: "Toast", ingredients: [IngredientDraft(name: "bread", quantity: Fraction(2), unit: .piece)],
                    instructions: [InstructionDraft(text: "Toast it.")], servings: 1, tags: ["Breakfast"])
    }

    @Test func createStoresNormalizedContentAndTags() throws {
        let detail = try book.recipes.create(toast)
        #expect(detail.recipe.currentVersion == 1)
        #expect(detail.version.content == toast.content.normalized())
        #expect(detail.tags == ["Breakfast"])
        #expect(try book.recipes.detail(detail.id) == detail)
        #expect(try book.recipes.count(includeArchived: false) == 1)
        #expect(try book.recipes.summaries(.all).map(\.title) == ["Toast"])
    }

    @Test func invalidDraftIsRejected() throws {
        #expect(throws: StoreError.invalidDraft([.emptyTitle, .noStep])) {
            try book.recipes.create(RecipeDraft(title: "", ingredients: [IngredientDraft(name: "x")]))
        }
        #expect(try book.recipes.count(includeArchived: true) == 0)
    }

    @Test func saveVersionsOnlyContentChanges() throws {
        let created = try book.recipes.create(toast)
        var draft = created.draft
        draft.tags = ["breakfast", "Quick"]
        let retagged = try book.recipes.save(draft, for: created.id)
        #expect(retagged.recipe.currentVersion == 1)
        #expect(retagged.tags == ["Breakfast", "Quick"])

        draft.content.title = "Buttered Toast"
        let edited = try book.recipes.save(draft, for: created.id)
        #expect(edited.recipe.currentVersion == 2)
        #expect(edited.version.title == "Buttered Toast")
        let versions = try book.recipes.versions(created.id)
        #expect(versions.map(\.version) == [2, 1])
        #expect(versions[1] == created.version)
    }

    @Test func restoreAppendsAVersion() throws {
        let created = try book.recipes.create(toast)
        var draft = created.draft
        draft.content.title = "Toast v2"
        _ = try book.recipes.save(draft, for: created.id)
        let restored = try book.recipes.restore(created.id, toVersion: 1)
        #expect(restored.recipe.currentVersion == 3)
        #expect(restored.version.restoredFromVersion == 1)
        #expect(restored.version.content == created.version.content)
        #expect(try book.recipes.versions(created.id).count == 3)
        #expect(throws: StoreError.versionNotFound(created.id, version: 9)) {
            try book.recipes.restore(created.id, toVersion: 9)
        }
    }

    @Test func archiveHidesAndUnarchiveRestores() throws {
        let created = try book.recipes.create(toast)
        try book.recipes.rate(created.id, value: 4)
        try book.recipes.archive(created.id)
        #expect(try book.recipes.summaries(.all).isEmpty)
        #expect(try book.recipes.summaries(RecipeQuery(includeArchived: true)).count == 1)
        #expect(try book.recipes.detail(created.id)?.recipe.isArchived == true)
        try book.recipes.unarchive(created.id)
        let back = try #require(try book.recipes.detail(created.id))
        #expect(!back.recipe.isArchived)
        #expect(back.currentRating?.value == 4)
        #expect(try book.recipes.summaries(.all).count == 1)
    }

    @Test func duplicateCopiesCurrentContentAndTags() throws {
        let folder = try book.folders.create(name: "Breakfast", parentID: nil)
        var draft = toast
        draft.folderID = folder.id
        let source = try book.recipes.create(draft)
        let copy = try book.recipes.duplicate(source.id)
        #expect(copy.recipe.parentRecipeID == source.id)
        #expect(copy.recipe.currentVersion == 1)
        #expect(copy.version.content == source.version.content)
        #expect(copy.tags == source.tags)
        #expect(copy.recipe.folderID == folder.id)
        let heritage = try #require(try book.recipes.heritage(copy.id))
        #expect(heritage.parent?.id == source.id)
        #expect(try book.recipes.heritage(source.id)?.children.map(\.id) == [copy.id])
    }

    @Test func notesJournal() throws {
        let created = try book.recipes.create(toast)
        let first = try book.recipes.addNote(to: created.id, body: "Good", cookedOn: nil)
        let second = try book.recipes.addNote(to: created.id, body: "Better", cookedOn: Date())
        #expect(try book.recipes.notes(created.id).map(\.id) == [second.id, first.id])
        try book.recipes.setNotePinned(first.id, true)
        #expect(try book.recipes.notes(created.id).map(\.id) == [first.id, second.id])
        let edited = try book.recipes.updateNote(second.id, body: "Best", cookedOn: nil)
        #expect(edited.createdAt == second.createdAt && edited.body == "Best" && edited.updatedAt > second.updatedAt)
        try book.recipes.deleteNote(second.id)
        #expect(try book.recipes.notes(created.id).map(\.id) == [first.id])
        #expect(try book.recipes.notes(created.id, includeDeleted: true).count == 2)
        try book.recipes.undeleteNote(second.id)
        #expect(try book.recipes.notes(created.id).count == 2)
        #expect(second.versionAtCreation == 1)
    }

    @Test func ratingsAreValidatedAndAppended() throws {
        let created = try book.recipes.create(toast)
        #expect(throws: StoreError.invalidRating(6)) { try book.recipes.rate(created.id, value: 6) }
        try book.recipes.rate(created.id, value: 2)
        try book.recipes.rate(created.id, value: 5)
        #expect(try book.recipes.ratings(created.id).map(\.value) == [2, 5])
        #expect(try book.recipes.detail(created.id)?.currentRating?.value == 5)
        #expect(try book.recipes.summaries(.all).first?.latestRating == 5)
    }

    @Test func missingRecipesThrow() throws {
        let ghost = Recipe.ID()
        #expect(throws: StoreError.recipeNotFound(ghost)) { try book.recipes.archive(ghost) }
        #expect(try book.recipes.detail(ghost) == nil)
        #expect(try book.recipes.heritage(ghost) == nil)
    }

    @Test func observationEmitsOnChange() async throws {
        let stream = book.recipes.observeSummaries(.all)
        var iterator = stream.makeAsyncIterator()
        let initial = try await iterator.next()
        #expect(initial?.isEmpty == true)
        _ = try book.recipes.create(toast)
        let next = try await iterator.next()
        #expect(next?.map(\.title) == ["Toast"])
    }
}
