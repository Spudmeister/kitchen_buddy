import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, export/import properties.
/// P21 folder export completeness, P22 v2 round trip, P23 v1 acceptance,
/// P24 import idempotence. Validates: Requirements 13.3, 13.4, 14.1, 14.3, 14.4, 4.5
@Suite struct ExportImportTests {
    /// P22: export the whole book, import into an empty one, states match
    /// (ids kept under skip-existing, so the fingerprints are equal outright).
    @Test(arguments: 0..<25)
    func fullBackupRoundTrips(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let (source, layoutA) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layoutA) }
        _ = try source.recipes.create(RecipeGen.draft.run(&rng))
        try BookDriver(book: source).apply(BookOperation.sequence(length: 5...30).run(&rng))
        if let first = try source.recipes.summaries(RecipeQuery(includeArchived: true)).first {
            try source.photos.add(ImageGen.image(width: 300, height: 200, seed: seed), to: first.id, caption: "c")
            try source.recipes.reportServings(first.id, servings: 4, note: "us")
            try source.recipes.reportServings(first.id, servings: nil, note: nil)
            if let name = try source.recipes.detail(first.id)?.version.ingredients.first?.name {
                try source.recipes.setFoodOverride(first.id, ingredientName: name, foodID: "flour-white")
                try source.recipes.setFoodOverride(first.id, ingredientName: name, foodID: nil)
                try source.recipes.clearFoodOverride(first.id, ingredientName: name)
            }
        }
        try source.recipes.setFoodMapping(ingredientName: "coconut", foodID: "coconut-milk")
        try source.recipes.setFoodMapping(ingredientName: "coconut", foodID: nil)
        let document = try source.exporter.export(.fullBackup)
        #expect(document.version == "2.2" && document.foodMappings?.count == 2, "seed \(seed)")
        let data = try document.encoded()
        let expected = try BookFingerprint.of(source)

        let (target, layoutB) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layoutB) }
        let reading = try ImportDocument.read(data)
        #expect(reading.source == .v2, "seed \(seed)")
        let preview = try target.importer.preview(reading)
        #expect(preview.recipeCount == document.recipes.count && preview.existingCount == 0, "seed \(seed)")
        let summary = try target.importer.perform(reading, policy: .skipExisting)
        #expect(summary.imported == document.recipes.count && summary.skipped == 0, "seed \(seed)")
        #expect(summary.photosWritten == document.recipes.reduce(0) { $0 + $1.photos.count }, "seed \(seed)")

        var actual = try BookFingerprint.of(target)
        // Photo ids/files match; the search projection is rebuilt from the same rows.
        #expect(actual.rows["recipes"] == expected.rows["recipes"], "seed \(seed): recipes")
        #expect(actual.rows["recipe_versions"] == expected.rows["recipe_versions"], "seed \(seed): versions")
        #expect(actual.rows["ingredients"] == expected.rows["ingredients"], "seed \(seed): ingredients")
        #expect(actual.rows["instructions"] == expected.rows["instructions"], "seed \(seed): instructions")
        #expect(actual.rows["ratings"] == expected.rows["ratings"], "seed \(seed): ratings")
        #expect(actual.rows["rating_clears"] == expected.rows["rating_clears"], "seed \(seed): clears")
        #expect(actual.rows["recipe_notes"] == expected.rows["recipe_notes"], "seed \(seed): notes")
        #expect(actual.rows["serving_reports"] == expected.rows["serving_reports"], "seed \(seed): serving reports (P37)")
        #expect(actual.rows["food_overrides"] == expected.rows["food_overrides"], "seed \(seed): food overrides (P37)")
        #expect(actual.rows["food_mappings"] == expected.rows["food_mappings"], "seed \(seed): food mappings (P37)")
        #expect(actual.rows["recipe_health"] == expected.rows["recipe_health"], "seed \(seed): health projection")
        #expect(actual.rows["folders"] == expected.rows["folders"], "seed \(seed): folders")
        #expect(actual.rows["recipe_tags"]?.count == expected.rows["recipe_tags"]?.count, "seed \(seed): tag links")
        #expect(actual.rows["photos"]?.count == expected.rows["photos"]?.count, "seed \(seed): photos")
        #expect(try target.backups.snapshots().contains { $0.reason == .preImport }, "seed \(seed): snapshot before import")

        // P24: importing again with skip-existing changes nothing.
        let again = try target.importer.perform(reading, policy: .skipExisting)
        #expect(again.imported == 0 && again.skipped == document.recipes.count, "seed \(seed)")
        actual = try BookFingerprint.of(target)
        #expect(actual.rows["recipes"] == expected.rows["recipes"] && actual.rows["recipe_versions"] == expected.rows["recipe_versions"], "seed \(seed): idempotent")

        // Copy policy adds fresh copies with new ids.
        let copies = try target.importer.perform(reading, policy: .copyAsNew)
        #expect(copies.imported == document.recipes.count, "seed \(seed)")
        #expect(try target.recipes.count(includeArchived: true) == document.recipes.count * 2, "seed \(seed)")
        #expect(Set(copies.importedIDs).isDisjoint(with: document.recipes.map(\.id)), "seed \(seed)")
        try source.close(); try target.close()
    }

    /// P21: a folder export holds exactly the non-archived recipes of the subtree.
    @Test(arguments: 0..<25)
    func folderExportIsExactlyTheSubtree(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let book = try TestDatabase.inMemory()
        var folders: [Folder] = []
        for spec in RecipeGen.folderTree(count: 2...6).run(&rng) {
            folders.append(try book.folders.create(name: spec.name, parentID: spec.parentIndex.map { folders[$0].id }))
        }
        var placed: [(Recipe.ID, Folder.ID?, Bool)] = []
        for var draft in RecipeGen.drafts(count: 2...12).run(&rng) {
            draft.folderID = Gen<Folder>.element(of: folders).optional(probability: 0.7).run(&rng)?.id
            let detail = try book.recipes.create(draft)
            let archived = Gen<Bool>.bool(probability: 0.25).run(&rng)
            if archived { try book.recipes.archive(detail.id) }
            placed.append((detail.id, draft.folderID, archived))
        }
        let root = Gen<Folder>.element(of: folders).run(&rng)
        let subtree = Set(try book.folders.subtree(of: root.id))
        let expected = Set(placed.filter { id, folderID, archived in !archived && folderID.map(subtree.contains) == true }.map { $0.0 })
        let document = try book.exporter.export(ExportOptions(scope: .folder(root.id)))
        #expect(Set(document.recipes.map(\.id)) == expected, "seed \(seed)")
        #expect(Set(document.folders.map(\.id)) == subtree, "seed \(seed)")
    }

    /// P23: every v1 fixture recipe imports with counts preserved, into an
    /// empty book and again as copies.
    /// P37: a 2.0 file (no `servingReports` / `foodOverrides` keys) still
    /// imports, and an override naming a food this build doesn't know
    /// lands as "automatic".
    @Test func version20FilesStillImportAndUnknownFoodsBecomeAutomatic() throws {
        let (source, layoutA) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layoutA) }
        let created = try source.recipes.create(RecipeDraft(title: "Toast", ingredients: [IngredientDraft(name: "bread", quantity: Fraction(2), unit: .piece)],
                                                            instructions: [InstructionDraft(text: "Toast.")], servings: 2))
        try source.recipes.setFoodOverride(created.id, ingredientName: "bread", foodID: "bread-white")
        var json = try JSONSerialization.jsonObject(with: try source.exporter.export(.fullBackup).encoded()) as! [String: Any]
        var recipes = json["recipes"] as! [[String: Any]]
        var overrides = recipes[0]["foodOverrides"] as! [[String: Any]]
        overrides[0]["foodId"] = "food-from-the-future"
        recipes[0]["foodOverrides"] = overrides
        json["recipes"] = recipes
        let future = try JSONSerialization.data(withJSONObject: json)

        var twoPointZero = json
        twoPointZero["version"] = "2.0"
        twoPointZero.removeValue(forKey: "foodMappings")
        recipes[0].removeValue(forKey: "foodOverrides")
        recipes[0].removeValue(forKey: "servingReports")
        twoPointZero["recipes"] = recipes
        let old = try JSONSerialization.data(withJSONObject: twoPointZero)

        let (target, layoutB) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layoutB) }
        let oldReading = try ImportDocument.read(old)
        #expect(oldReading.document.recipes[0].foodOverrides.isEmpty && oldReading.document.recipes[0].servingReports.isEmpty)
        #expect(oldReading.document.foodMappings == nil)
        #expect(try target.importer.perform(oldReading, policy: .skipExisting).imported == 1)

        let (target2, layoutC) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layoutC) }
        #expect(try target2.importer.perform(try ImportDocument.read(future), policy: .skipExisting).imported == 1)
        let stored = try target2.recipes.foodOverrides(created.id)
        #expect(stored.count == 1 && stored[0].isAutomaticMarker)
        #expect(FoodOverride.effective(stored).isEmpty)
        try source.close(); try target.close(); try target2.close()
    }

    @Test func legacyV1FileImports() throws {
        let book = try TestDatabase.inMemory()
        let reading = try ImportDocument.read(try LegacyFixtures.recipesV1Data())
        #expect(reading.source == .v1 && reading.document.recipes.count == 34)
        let preview = try book.importer.preview(reading)
        #expect(preview.recipeCount == 34 && preview.existingCount == 0 && preview.versionCount == 34)
        let summary = try book.importer.perform(reading, policy: .skipExisting)
        #expect(summary.imported == 34)
        let drafts = try LegacyFixtures.recipesV1()
        let stored = try book.recipes.summaries(RecipeQuery(includeArchived: true))
        #expect(Set(stored.map(\.title)) == Set(drafts.map(\.content.title)))
        let bruschetta = try #require(stored.first { $0.title == "Bruschetta" })
        #expect(try book.recipes.detail(bruschetta.id)?.version.ingredients.count == 6)
        #expect(try book.recipes.detail(bruschetta.id)?.tags.count == 4)
    }

    @Test func shareExportsCurrentVersionOnlyAndDanglingParentsClear() throws {
        let book = try TestDatabase.inMemory()
        let folder = try book.folders.create(name: "F", parentID: nil)
        let parent = try book.recipes.create(RecipeDraft(title: "Parent", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")], folderID: folder.id))
        let child = try book.recipes.duplicate(parent.id)
        var draft = child.draft
        draft.content.title = "Child v2"
        _ = try book.recipes.save(draft, for: child.id)
        try book.recipes.rate(child.id, value: 5)
        try book.recipes.addNote(to: child.id, body: "n", cookedOn: nil)

        let share = try book.exporter.export(.share(.recipe(child.id), includePhotos: false))
        let record = try #require(share.recipes.first)
        #expect(record.versions.map(\.version) == [2] && record.ratings.isEmpty && record.notes.isEmpty && record.folderId == nil)
        #expect(record.parentRecipeId == parent.id)

        // Into another book where the parent is absent: the link clears (4.5).
        let other = try TestDatabase.inMemory()
        let summary = try other.importer.perform(try ImportDocument.read(try share.encoded()), policy: .skipExisting)
        #expect(summary.imported == 1)
        let imported = try #require(try other.recipes.detail(child.id))
        #expect(imported.recipe.parentRecipeID == nil && imported.recipe.currentVersion == 2 && imported.version.title == "Child v2")
        #expect(try other.recipes.versions(child.id).count == 1)
        #expect(try other.recipes.restore(child.id, toVersion: 2).recipe.currentVersion == 3, "history keeps working after a partial import")
    }

    @Test func validationRejectsBadFiles() {
        #expect(throws: ImportDocument.Problem.notJSON) { try ImportDocument.read(Data("nope".utf8)) }
        #expect(throws: ImportDocument.Problem.unknownFormat("other-app")) { try ImportDocument.read(Data(#"{"format":"other-app"}"#.utf8)) }
        #expect(throws: ImportDocument.Problem.unsupportedVersion("3.0")) { try ImportDocument.read(Data(#"{"format":"kitchenbuddy-export","version":"3.0"}"#.utf8)) }
        #expect(throws: ImportDocument.Problem.noRecipes) { try ImportDocument.read(Data(#"{"format":"kitchenbuddy-export","version":"2.0","exportedAt":"2026-01-01T00:00:00Z","appBuild":"1","folders":[],"recipes":[]}"#.utf8)) }
        do {
            _ = try ImportDocument.read(Data(#"{"format":"kitchenbuddy-export","version":"2.0","recipes":[{"id":"x"}]}"#.utf8))
            Issue.record("expected malformed")
        } catch let problem as ImportDocument.Problem {
            if case .malformed(let detail) = problem { #expect(detail.contains("missing")) } else { Issue.record("wrong problem \(problem)") }
        } catch { Issue.record("wrong error \(error)") }
    }

    @Test func aBrokenRecordImportsNothing() throws {
        let book = try TestDatabase.inMemory()
        let good = try book.recipes.create(RecipeDraft(title: "Good", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        var document = try book.exporter.export(.fullBackup)
        var broken = document.recipes[0]
        broken.id = Recipe.ID()
        broken.currentVersion = 9   // no such version → the transaction must roll back
        document.recipes.append(broken)
        let other = try TestDatabase.inMemory()
        #expect(throws: ImportDocument.Problem.self) { try other.importer.perform(try ImportDocument.read(try document.encoded()), policy: .skipExisting) }
        #expect(try other.recipes.count(includeArchived: true) == 0, "nothing half-imported")
        _ = good
    }
}
