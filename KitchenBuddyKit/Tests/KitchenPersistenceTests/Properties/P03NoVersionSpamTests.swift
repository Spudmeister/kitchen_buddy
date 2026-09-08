import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 3: No version spam — tag, folder, rating, note, archive changes
/// and unchanged saves never create a version. Validates: Requirements 2.2
@Suite struct P03NoVersionSpamTests {
    @Test(arguments: 0..<200)
    func nonContentChangesKeepTheVersion(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let folder = try book.folders.create(name: "F", parentID: nil)
        let created = try book.recipes.create(RecipeGen.draft.run(&rng))
        let steps = Gen<Int>.int(in: 1...12).run(&rng)

        for _ in 0..<steps {
            switch Int.random(in: 0..<8, using: &rng) {
            case 0: try book.recipes.setTags(RecipeGen.tags.run(&rng), for: created.id)
            case 1: try book.tags.add(RecipeGen.tag.run(&rng), to: created.id)
            case 2: try book.recipes.move(created.id, toFolder: Bool.random(using: &rng) ? folder.id : nil)
            case 3: try book.recipes.rate(created.id, value: Int.random(in: 1...5, using: &rng))
            case 4: try book.recipes.addNote(to: created.id, body: "note", cookedOn: nil)
            case 5: try book.recipes.archive(created.id)
            case 6: try book.recipes.unarchive(created.id)
            default:
                var draft = try #require(try book.recipes.detail(created.id)).draft
                draft.tags = RecipeGen.tags.run(&rng)
                draft.folderID = Bool.random(using: &rng) ? folder.id : nil
                // Whitespace-only differences are not content changes either.
                draft.content.title = "  " + draft.content.title + " "
                _ = try book.recipes.save(draft, for: created.id)
            }
            let detail = try #require(try book.recipes.detail(created.id))
            #expect(detail.recipe.currentVersion == 1, "seed \(seed)")
            #expect(try book.recipes.versions(created.id).count == 1, "seed \(seed)")
            #expect(detail.version == created.version, "seed \(seed)")
        }
    }
}
