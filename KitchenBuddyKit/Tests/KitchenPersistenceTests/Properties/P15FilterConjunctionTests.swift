import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 15: Filter conjunction — every result satisfies all active
/// filters and no qualifying recipe is missing. Validates: Requirements 6.2
@Suite struct P15FilterConjunctionTests {
    @Test(arguments: 0..<150)
    func resultsAreExactlyTheQualifyingRecipes(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        let specs = RecipeGen.folderTree(count: 1...4).run(&rng)
        var folders: [Folder] = []
        for spec in specs {
            folders.append(try book.folders.create(name: spec.name, parentID: spec.parentIndex.map { folders[$0].id }))
        }
        var details: [RecipeDetail] = []
        for var draft in RecipeGen.drafts(count: 3...14).run(&rng) {
            draft.folderID = Gen<Folder>.element(of: folders).optional(probability: 0.6).run(&rng)?.id
            let detail = try book.recipes.create(draft)
            if Bool.random(using: &rng) { try book.recipes.rate(detail.id, value: Int.random(in: 1...5, using: &rng)) }
            if Gen<Bool>.bool(probability: 0.25).run(&rng) { try book.recipes.archive(detail.id) }
            details.append(try #require(try book.recipes.detail(detail.id)))
        }

        let query = RecipeQuery(
            tags: Gen<[String]>.array(of: RecipeGen.tag, count: 0...2).run(&rng),
            minimumRating: Gen<Int>.int(in: 1...5).optional(probability: 0.4).run(&rng),
            maximumTotalMinutes: Gen<Int>.int(in: 0...300).optional(probability: 0.4).run(&rng),
            folderID: Gen<Folder>.element(of: folders).optional(probability: 0.4).run(&rng)?.id,
            includeArchived: Gen<Bool>.bool(probability: 0.3).run(&rng)
        )
        let scope = try query.folderID.map { Set(try book.folders.subtree(of: $0)) }
        let expected = Set(details.filter { detail in
            let tags = Set(detail.tags.map(TagName.key))
            guard query.tags.allSatisfy({ tags.contains(TagName.key($0)) }) else { return false }
            if let minimum = query.minimumRating, (detail.currentRating?.value ?? 0) < minimum { return false }
            if let maximum = query.maximumTotalMinutes {
                guard let total = detail.version.totalMinutes, total <= maximum else { return false }
            }
            if let scope, let folderID = detail.recipe.folderID { if !scope.contains(folderID) { return false } }
            else if scope != nil { return false }
            if !query.includeArchived && detail.recipe.isArchived { return false }
            return true
        }.map(\.id))

        let results = try book.recipes.summaries(query)
        #expect(Set(results.map(\.id)) == expected, "seed \(seed): \(query)")
        #expect(results.count == Set(results.map(\.id)).count, "seed \(seed): duplicate rows")
    }
}
