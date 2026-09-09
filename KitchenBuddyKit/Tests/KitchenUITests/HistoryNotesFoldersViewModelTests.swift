import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, M5 view models end to end over the store:
/// P2–P4 (versions/restore), P25 (notes), P19/P20 (lineage, folder cycles).
/// Validates: Requirements 2.3–2.5, 4.3, 4.4, 7.1–7.5, 16.1–16.6
@Suite struct HistoryNotesFoldersViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let book = try TestDatabase.inMemory()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    static func draft(_ title: String, folderID: Folder.ID? = nil) -> RecipeDraft {
        RecipeDraft(title: title, ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")], folderID: folderID)
    }

    @Test @MainActor func versionHistorySummariesAndRestore() throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.draft("Toast"))
        var draft = created.draft
        draft.content.title = "Toast Deluxe"
        draft.content.ingredients.append(IngredientDraft(name: "butter"))
        _ = try environment.book.recipes.save(draft, for: created.id)
        draft.content.instructions.removeAll()
        draft.content.instructions = [InstructionDraft(text: "Different.")]
        draft.content.servings = 2
        _ = try environment.book.recipes.save(draft, for: created.id)

        let model = VersionHistoryViewModel(environment: environment, recipeID: created.id)
        model.load()
        #expect(model.entries.map(\.id) == [3, 2, 1])
        #expect(model.entries[2].summary == "First version")
        #expect(model.entries[1].summary == "Title changed, 1 ingredient added")
        #expect(model.entries[0].summary == "Steps changed, Servings changed")
        #expect(model.entries[0].isCurrent && !model.entries[1].isCurrent)

        #expect(model.restore(1))
        #expect(model.entries.map(\.id) == [4, 3, 2, 1])
        #expect(model.entries[0].summary == "Restored from v1" && model.entries[0].isCurrent)
        #expect(model.entries[0].version.content == model.entries[3].version.content, "restore copies, never mutates")
        #expect(!model.restore(99) && model.error != nil)

        let past = RecipeDetailViewModel(environment: environment, recipeID: created.id, versionNumber: 2)
        past.load()
        #expect(past.isReadOnly && past.detail?.version.title == "Toast Deluxe")
        #expect(past.restoreThisVersion())
        #expect(try environment.book.recipes.detail(created.id)?.recipe.currentVersion == 5)
    }

    @Test @MainActor func notesJournalWithUndo() async throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.draft("Toast"))
        let editor = NoteEditorViewModel(environment: environment, recipeID: created.id, noteID: nil)
        #expect(editor.isNew && !editor.canSave && editor.cookedOn != nil)
        editor.body = "  Too much butter.  "
        #expect(editor.save())
        let second = NoteEditorViewModel(environment: environment, recipeID: created.id, noteID: nil)
        second.body = "Better."
        second.cookedOn = nil
        #expect(second.save())

        let model = NotesViewModel(environment: environment, recipeID: created.id)
        model.load()
        #expect(model.notes.map(\.body) == ["Better.", "Too much butter."])
        model.setPinned(model.notes[1], true)
        #expect(model.notes.map(\.body) == ["Too much butter.", "Better."], "pinned first")

        let edit = NoteEditorViewModel(environment: environment, recipeID: created.id, noteID: model.notes[1].id)
        #expect(!edit.isNew && edit.body == "Better.")
        edit.body = "Much better."
        #expect(edit.save())
        model.load()
        #expect(model.notes[1].body == "Much better." && model.notes[1].createdAt == model.notes[1].createdAt)

        model.delete(model.notes[1], undoWindow: 0.3)
        #expect(model.notes.count == 1 && model.undoableDeletion != nil)
        model.undoDelete()
        #expect(model.notes.count == 2 && model.undoableDeletion == nil)
        model.delete(model.notes[1], undoWindow: 0.2)
        // Await the window's own task: polling a wall clock timed out on CI
        // when other main-actor tests starved the timer (PR #16).
        await model.undoTimer?.value
        #expect(model.undoableDeletion == nil, "the undo offer expires with the window")
        #expect(try environment.book.recipes.notes(created.id, includeDeleted: true).count == 2, "soft delete keeps the row")
        #expect(try environment.book.recipes.detail(created.id)?.recipe.currentVersion == 1, "notes never version")
    }

    @Test @MainActor func folderBrowserRejectsCyclesAndSoftDeletes() throws {
        let environment = try Self.environment()
        let model = FolderBrowserViewModel(environment: environment)
        let a = try environment.book.folders.create(name: "A", parentID: nil)
        let b = try environment.book.folders.create(name: "B", parentID: a.id)
        let c = try environment.book.folders.create(name: "C", parentID: b.id)
        let other = try environment.book.folders.create(name: "Other", parentID: nil)
        let recipe = try environment.book.recipes.create(Self.draft("In C", folderID: c.id))
        _ = try environment.book.recipes.create(Self.draft("In A", folderID: a.id))
        model.load()
        #expect(model.children(of: nil).map(\.name) == ["A", "Other"])
        #expect(model.count(of: a.id) == 2 && model.count(of: b.id) == 1 && model.count(of: c.id) == 1 && model.count(of: other.id) == 0)
        #expect(model.moveTargets(for: a.id).map(\.folder.name) == ["Other"], "a folder's own subtree is never offered")

        #expect(!model.move(a.id, toParent: c.id))
        #expect(model.error?.contains("into itself") == true)
        model.error = nil
        #expect(!model.move(a.id, toParent: a.id))
        #expect(model.move(b.id, toParent: other.id))
        #expect(model.folder(b.id)?.parentID == other.id && model.count(of: other.id) == 1)

        model.rename(other.id, to: "Elsewhere")
        #expect(model.folder(other.id)?.name == "Elsewhere")
        model.move(recipes: [recipe.id], to: nil)
        #expect(try environment.book.recipes.detail(recipe.id)?.recipe.folderID == nil)

        model.delete(other.id)
        #expect(model.folder(other.id) == nil, "soft-deleted folders leave the live tree")
        #expect(model.folder(b.id)?.parentID == nil, "children move up to the parent")
        #expect(try environment.book.folders.folder(other.id)?.deletedAt != nil, "but the row remains")
    }

    @Test @MainActor func lineageAndHistoryScreensBuild() async throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(Self.draft("Root"))
        let copy = try environment.book.recipes.duplicate(created.id)
        let detail = RecipeDetailViewModel(environment: environment, recipeID: copy.id)
        detail.load()
        #expect(detail.hasLineage && detail.heritage?.parent?.id == created.id)
        _ = LineageView(environment: environment, recipeID: copy.id).body
        _ = VersionHistoryView(environment: environment, recipeID: copy.id).body
        _ = NotesView(environment: environment, recipeID: copy.id).body
        _ = NoteEditorView(environment: environment, recipeID: copy.id, noteID: nil).body
        _ = FoldersView(environment: environment).body
        _ = RatingHistorySheet(environment: environment, recipeID: copy.id).body

        let gallery = PhotoGalleryViewModel(environment: environment, recipeID: copy.id)
        gallery.load()
        #expect(gallery.photos.isEmpty)
        await gallery.add(ImageGen.image(width: 300, height: 200))
        await gallery.add(Data("bad".utf8))
        #expect(gallery.photos.count == 1 && gallery.error != nil)
        gallery.setCaption(gallery.photos[0], "Golden")
        #expect(gallery.photos[0].caption == "Golden")
        gallery.remove(gallery.photos[0])
        #expect(gallery.photos.isEmpty)
        _ = PhotoGalleryView(environment: environment, recipeID: copy.id).body
        _ = PhotoViewerView(environment: environment, recipeID: copy.id, index: 0).body
    }
}
