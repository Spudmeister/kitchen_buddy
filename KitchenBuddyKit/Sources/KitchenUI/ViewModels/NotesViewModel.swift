import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// A recipe's notes journal: pinned first then newest first, edit, pin,
/// soft delete with a short undo window.
///
/// Requirements: kitchen-buddy-ios 7.1–7.5
@MainActor @Observable
public final class NotesViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public private(set) var notes: [RecipeNote] = []
    /// The most recently deleted note, offered for Undo until dismissed.
    public private(set) var undoableDeletion: RecipeNote?
    public var error: String?
    private var undoTimer: Task<Void, Never>?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        do {
            notes = try environment.book.recipes.notes(recipeID, includeDeleted: false)
        } catch {
            self.error = "\(error)"
        }
    }

    public func setPinned(_ note: RecipeNote, _ pinned: Bool) {
        perform { try $0.recipes.setNotePinned(note.id, pinned) }
    }

    /// Soft delete; the note stays undoable for `undoWindow` seconds.
    public func delete(_ note: RecipeNote, undoWindow: TimeInterval = 6) {
        perform { try $0.recipes.deleteNote(note.id) }
        undoableDeletion = note
        undoTimer?.cancel()
        undoTimer = Task { [weak self] in
            try? await Task.sleep(for: .seconds(undoWindow))
            guard !Task.isCancelled else { return }
            self?.undoableDeletion = nil
        }
    }

    public func undoDelete() {
        guard let note = undoableDeletion else { return }
        undoTimer?.cancel()
        undoableDeletion = nil
        perform { try $0.recipes.undeleteNote(note.id) }
    }

    public func dismissUndo() {
        undoTimer?.cancel()
        undoableDeletion = nil
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            load()
        } catch {
            self.error = "\(error)"
        }
    }
}

/// The note editor sheet: new or existing note, body plus optional
/// cooked-on date. Edits keep `createdAt`; notes are never versioned.
@MainActor @Observable
public final class NoteEditorViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public let noteID: RecipeNote.ID?
    public var body = ""
    public var cookedOn: Date?
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID, noteID: RecipeNote.ID?) {
        self.environment = environment
        self.recipeID = recipeID
        self.noteID = noteID
        if let noteID, let note = try? environment.book.recipes.notes(recipeID, includeDeleted: true).first(where: { $0.id == noteID }) {
            body = note.body
            cookedOn = note.cookedOn
        } else {
            cookedOn = Date()
        }
    }

    public var isNew: Bool { noteID == nil }
    public var canSave: Bool { !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    @discardableResult
    public func save() -> Bool {
        guard canSave else { return false }
        let text = body.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            if let noteID {
                _ = try environment.book.recipes.updateNote(noteID, body: text, cookedOn: cookedOn)
            } else {
                _ = try environment.book.recipes.addNote(to: recipeID, body: text, cookedOn: cookedOn)
            }
            return true
        } catch {
            self.error = "\(error)"
            return false
        }
    }
}
