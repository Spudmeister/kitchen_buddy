import Foundation
import Testing
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, every committed schema fixture opens forever.
/// `kb-schema-v1.sqlite` and later fixtures were written by `writeSchemaFixture` (run with
/// `KB_WRITE_SCHEMA_FIXTURE=<path>`; see scripts/make-schema-fixture.sh)
/// and must never be regenerated once a later schema version exists.
/// Validates: iron rule 2 (ADR-003)
@Suite struct MigrationFixtureTests {
    /// Six imported fixture recipes plus one duplicate; one of them archived.
    static let importedRecipeCount = 6
    static let fixtureRecipeCount = 7

    @Test func schemaV1FixtureOpensAndMigrates() throws {
        let fixture = try #require(Bundle.module.url(forResource: "kb-schema-v1", withExtension: "sqlite", subdirectory: "fixtures"),
                                   "missing fixture — run scripts/make-schema-fixture.sh")
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        try FileManager.default.createDirectory(at: layout.root, withIntermediateDirectories: true)
        try FileManager.default.copyItem(at: fixture, to: layout.databaseURL)

        // System clock: the fixture's own timestamps are 2026-01-01 ticks, and a
        // clear event must land after them to count.
        let book = try RecipeBook.open(layout, clock: .system)
        let integrity = try book.writer.read { db in try String.fetchOne(db, sql: "PRAGMA integrity_check") }
        #expect(integrity == "ok")
        let applied = try book.writer.read { db in try DatabaseStack.migrator.appliedMigrations(db) }
        #expect(applied == Migrations.identifiers)
        guard case .migrated(let preMigration?) = book.launchReport else {
            Issue.record("a v1 file must be snapshotted before v2 migrates it: \(book.launchReport)")
            return
        }
        #expect(preMigration.reason == .preMigration && preMigration.isVerified)

        #expect(try book.recipes.count(includeArchived: true) == Self.fixtureRecipeCount)
        #expect(try book.recipes.count(includeArchived: false) == Self.fixtureRecipeCount - 1)
        #expect(try book.recipes.summaries(RecipeQuery(includeArchived: true)).filter { $0.isArchived }.count == 1)
        #expect(try book.recipes.summaries(RecipeQuery(text: "brus")).map(\.title) == ["Bruschetta"])
        let bruschetta = try #require(try book.recipes.summaries(RecipeQuery(text: "bruschetta")).first)
        #expect(try book.recipes.versions(bruschetta.id).count == 2)
        #expect(try book.recipes.ratings(bruschetta.id).map(\.value) == [4, 5])
        try book.recipes.clearRating(bruschetta.id)
        #expect(try book.recipes.detail(bruschetta.id)?.currentRating == nil, "v2 clears work on a migrated v1 book")
        #expect(try book.recipes.ratings(bruschetta.id).count == 2, "history untouched")
        #expect(try book.recipes.notes(bruschetta.id).count == 1)
        #expect(try book.folders.all().count == 2)
        #expect(try book.preferences.load().unitPreference == .metric)

        // Still writable after migration.
        let added = try book.recipes.create(RecipeDraft(title: "New", ingredients: [IngredientDraft(name: "x")],
                                                        instructions: [InstructionDraft(text: "y")]))
        #expect(try book.recipes.detail(added.id) != nil)
        try book.close()
    }

    /// The v2 fixture (written 2026-09-09, before `v3-health`) opens, migrates
    /// to v3 and keeps its rating clear; the new tables start empty and the
    /// health projection is built for every recipe.
    @Test func schemaV2FixtureOpensAndMigrates() throws {
        let fixture = try #require(Bundle.module.url(forResource: "kb-schema-v2", withExtension: "sqlite", subdirectory: "fixtures"))
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        try FileManager.default.createDirectory(at: layout.root, withIntermediateDirectories: true)
        try FileManager.default.copyItem(at: fixture, to: layout.databaseURL)

        let book = try RecipeBook.open(layout, clock: .system)
        #expect(try book.writer.read { db in try String.fetchOne(db, sql: "PRAGMA integrity_check") } == "ok")
        #expect(try book.writer.read { db in try DatabaseStack.migrator.appliedMigrations(db) } == Migrations.identifiers)
        guard case .migrated(let preMigration?) = book.launchReport else {
            Issue.record("a v2 file must be snapshotted before v3 migrates it: \(book.launchReport)")
            return
        }
        #expect(preMigration.reason == .preMigration && preMigration.isVerified)
        #expect(try book.recipes.count(includeArchived: true) == Self.fixtureRecipeCount)

        let cleared = try #require(try book.recipes.summaries(RecipeQuery(includeArchived: true)).first { summary in
            try book.recipes.ratingEvents(summary.id).contains { if case .cleared = $0 { return true } else { return false } }
        })
        #expect(try book.recipes.detail(cleared.id)?.currentRating == nil, "the v2 clear still counts")

        #expect(try book.healthRows().count == Self.fixtureRecipeCount, "every recipe gets a health row at open")
        let bruschetta = try #require(try book.recipes.summaries(RecipeQuery(text: "bruschetta")).first)
        #expect(bruschetta.health != nil)
        #expect(try book.recipes.servingReports(bruschetta.id).isEmpty && (try book.recipes.foodOverrides(bruschetta.id)).isEmpty)
        try book.recipes.reportServings(bruschetta.id, servings: 2, note: "just us")
        #expect(try book.recipes.detail(bruschetta.id)?.effectiveServings == 2)
        try book.close()
    }

    /// The v3 fixture (written 2026-09-10, before `v4-food-mappings`) opens,
    /// migrates, keeps its serving report and recipe override, and starts
    /// with no book-wide mappings.
    @Test func schemaV3FixtureOpensAndMigrates() throws {
        let fixture = try #require(Bundle.module.url(forResource: "kb-schema-v3", withExtension: "sqlite", subdirectory: "fixtures"))
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        try FileManager.default.createDirectory(at: layout.root, withIntermediateDirectories: true)
        try FileManager.default.copyItem(at: fixture, to: layout.databaseURL)

        let book = try RecipeBook.open(layout, clock: .system)
        #expect(try book.writer.read { db in try String.fetchOne(db, sql: "PRAGMA integrity_check") } == "ok")
        #expect(try book.writer.read { db in try DatabaseStack.migrator.appliedMigrations(db) } == Migrations.identifiers)
        guard case .migrated(let preMigration?) = book.launchReport else {
            Issue.record("a v3 file must be snapshotted before v4 migrates it: \(book.launchReport)")
            return
        }
        #expect(preMigration.isVerified)
        let bruschetta = try #require(try book.recipes.summaries(RecipeQuery(text: "bruschetta")).first)
        #expect(try book.recipes.detail(bruschetta.id)?.effectiveServings == 4, "the v3 serving report still counts")
        #expect(FoodOverride.effective(try book.recipes.foodOverrides(bruschetta.id))["baguette"] == .some("bread-sourdough"))
        #expect(try book.recipes.foodMappings().isEmpty)
        try book.recipes.setFoodMapping(ingredientName: "roma tomatoes", foodID: "tomatoes-canned")
        #expect(try book.recipes.nutrition(bruschetta.id)?.lines.first { $0.ingredient.name == "roma tomatoes" }?.match?.food.id == "tomatoes-canned")
        try book.close()
    }

    /// Fixture generator, gated by an environment variable so it never runs
    /// in CI. Populates a fresh database at the *current* schema with a
    /// little of everything; run it once, just before a new migration lands,
    /// naming the file after the schema version it holds.
    @Test(.enabled(if: ProcessInfo.processInfo.environment["KB_WRITE_SCHEMA_FIXTURE"] != nil))
    func writeSchemaFixture() throws {
        let output = try #require(ProcessInfo.processInfo.environment["KB_WRITE_SCHEMA_FIXTURE"])
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        let book = try RecipeBook.open(layout, clock: TestDatabase.clock())

        let baking = try book.folders.create(name: "Baking", parentID: nil)
        let bread = try book.folders.create(name: "Bread", parentID: baking.id)
        let drafts = Array(try LegacyFixtures.recipesV1().prefix(Self.importedRecipeCount))
        let imported = try book.importDrafts(drafts)
        let bruschetta = try #require(imported.first { $0.title == "Bruschetta" })
        try book.recipes.move(bruschetta.id, toFolder: bread.id)
        try book.recipes.rate(bruschetta.id, value: 4)
        try book.recipes.rate(bruschetta.id, value: 5)
        if Migrations.identifiers.contains("v2-rating-clears") {
            // v2 fixtures carry a clear so v3+ keeps honouring rating_clears.
            try book.recipes.rate(imported[3].id, value: 3)
            try book.recipes.clearRating(imported[3].id)
        }
        try book.recipes.addNote(to: bruschetta.id, body: "Use ripe tomatoes.", cookedOn: nil)
        if Migrations.identifiers.contains("v3-health") {
            // v3 fixtures carry a serving report and a food override so v4+ keeps honouring them.
            try book.recipes.reportServings(bruschetta.id, servings: 4, note: "just us")
            try book.recipes.setFoodOverride(bruschetta.id, ingredientName: "baguette", foodID: "bread-sourdough")
        }
        var draft = bruschetta.draft
        draft.content.description = "Italian tomato appetizer, v2"
        _ = try book.recipes.save(draft, for: bruschetta.id)
        _ = try book.recipes.duplicate(imported[1].id)
        try book.recipes.archive(imported[2].id)
        try book.preferences.save(Preferences(unitPreference: .metric, defaultServings: 4))

        try? FileManager.default.removeItem(atPath: output)
        try book.writer.writeWithoutTransaction { db in
            try db.execute(sql: "VACUUM INTO ?", arguments: [output])
        }
        try book.close()
        #expect(FileManager.default.fileExists(atPath: output))
    }
}
