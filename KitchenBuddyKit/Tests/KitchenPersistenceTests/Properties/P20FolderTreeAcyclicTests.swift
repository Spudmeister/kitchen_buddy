import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 20: Folder tree acyclic — moves into self or a descendant are
/// rejected and leave the tree unchanged; every recipe has at most one
/// folder. Validates: Requirements 16.1, 16.2
@Suite struct P20FolderTreeAcyclicTests {
    @Test(arguments: 0..<200)
    func movesNeverCreateCycles(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        var folders: [Folder] = []
        for spec in RecipeGen.folderTree(count: 2...8).run(&rng) {
            folders.append(try book.folders.create(name: spec.name, parentID: spec.parentIndex.map { folders[$0].id }))
        }
        let recipe = try book.recipes.create(RecipeGen.draft.run(&rng))

        for _ in 0..<Gen<Int>.int(in: 1...10).run(&rng) {
            let mover = Gen<Folder>.element(of: folders).run(&rng)
            let target = Gen<Folder>.element(of: folders).optional(probability: 0.85).run(&rng)
            let before = try book.folders.all()
            if let target, try book.folders.subtree(of: mover.id).contains(target.id) {
                #expect(throws: StoreError.folderCycle) { try book.folders.move(mover.id, toParent: target.id) }
                #expect(try book.folders.all() == before, "seed \(seed): rejected move changed the tree")
            } else {
                let moved = try book.folders.move(mover.id, toParent: target?.id)
                #expect(moved.parentID == target?.id, "seed \(seed)")
            }
            try book.recipes.move(recipe.id, toFolder: Gen<Folder>.element(of: folders).optional().run(&rng)?.id)

            // Walking up from every folder terminates at a root.
            let parents = Dictionary(uniqueKeysWithValues: try book.folders.all().map { ($0.id, $0.parentID) })
            for start in parents.keys {
                var cursor: Folder.ID? = start
                var steps = 0
                while let id = cursor, steps <= parents.count {
                    cursor = parents[id] ?? nil
                    steps += 1
                }
                #expect(cursor == nil, "seed \(seed): cycle reachable from \(start)")
            }
        }
        let placement = try #require(try book.recipes.detail(recipe.id)).recipe.folderID
        #expect(placement == nil || folders.contains { $0.id == placement }, "seed \(seed)")
    }
}
