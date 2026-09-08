import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 25: Notes journal — pinned-first then newest-first; edits keep
/// createdAt; deleted notes remain with deletedAt and are hidden by default.
/// Validates: Requirements 7.1–7.5
@Suite struct P25NotesJournalTests {
    @Test(arguments: 0..<200)
    func journalOrderAndSoftDelete(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let recipe = try book.recipes.create(RecipeGen.draft.run(&rng))
        var notes: [RecipeNote] = []
        for _ in 0..<Gen<Int>.int(in: 1...8).run(&rng) {
            if Gen<Bool>.bool(probability: 0.3).run(&rng) {
                var draft = recipe.draft
                draft.content = RecipeGen.edited(draft.content).run(&rng)
                _ = try book.recipes.save(draft, for: recipe.id)
            }
            let cookedOn = Gen<Date>.date().optional().run(&rng) ?? nil
            let note = try book.recipes.addNote(to: recipe.id, body: RecipeGen.phrase(words: 1...5).run(&rng), cookedOn: cookedOn)
            #expect(note.versionAtCreation == (try book.recipes.detail(recipe.id)?.recipe.currentVersion), "seed \(seed)")
            #expect(note.cookedOn == cookedOn.map(Timestamp.normalize), "seed \(seed)")
            notes.append(note)
        }
        var pinned = Set<RecipeNote.ID>()
        var deleted = Set<RecipeNote.ID>()
        for note in notes {
            if Gen<Bool>.bool(probability: 0.3).run(&rng) {
                let edited = try book.recipes.updateNote(note.id, body: note.body + "!", cookedOn: note.cookedOn)
                #expect(edited.createdAt == note.createdAt && edited.updatedAt >= note.updatedAt, "seed \(seed)")
                #expect(edited.body == note.body + "!", "seed \(seed)")
            }
            if Gen<Bool>.bool(probability: 0.4).run(&rng) { try book.recipes.setNotePinned(note.id, true); pinned.insert(note.id) }
            if Gen<Bool>.bool(probability: 0.3).run(&rng) { try book.recipes.deleteNote(note.id); deleted.insert(note.id) }
        }

        let visible = try book.recipes.notes(recipe.id)
        #expect(Set(visible.map(\.id)) == Set(notes.map(\.id)).subtracting(deleted), "seed \(seed)")
        for (a, b) in zip(visible, visible.dropFirst()) {
            if a.pinned == b.pinned { #expect(a.createdAt >= b.createdAt, "seed \(seed)") }
            else { #expect(a.pinned && !b.pinned, "seed \(seed): pinned not first") }
        }
        #expect(visible.allSatisfy { $0.pinned == pinned.contains($0.id) }, "seed \(seed)")
        let everything = try book.recipes.notes(recipe.id, includeDeleted: true)
        #expect(everything.count == notes.count, "seed \(seed)")
        #expect(everything.allSatisfy { ($0.deletedAt != nil) == deleted.contains($0.id) }, "seed \(seed)")
        #expect(try book.recipes.detail(recipe.id)?.notes == visible, "seed \(seed)")
        #expect(try book.recipes.detail(recipe.id)?.recipe.currentVersion == (try book.recipes.versions(recipe.id).count), "seed \(seed)")
    }
}
