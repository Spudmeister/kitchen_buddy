import Foundation
import Testing
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, every committed schema fixture opens forever.
/// `kb-schema-v1.sqlite` was written by `writeSchemaV1Fixture` (run with
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

        let book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        let integrity = try book.writer.read { db in try String.fetchOne(db, sql: "PRAGMA integrity_check") }
        #expect(integrity == "ok")
        let applied = try book.writer.read { db in try DatabaseStack.migrator.appliedMigrations(db) }
        #expect(applied == Migrations.identifiers)

        #expect(try book.recipes.count(includeArchived: true) == Self.fixtureRecipeCount)
        #expect(try book.recipes.count(includeArchived: false) == Self.fixtureRecipeCount - 1)
        #expect(try book.recipes.summaries(RecipeQuery(includeArchived: true)).filter { $0.isArchived }.count == 1)
        #expect(try book.recipes.summaries(RecipeQuery(text: "brus")).map(\.title) == ["Bruschetta"])
        let bruschetta = try #require(try book.recipes.summaries(RecipeQuery(text: "bruschetta")).first)
        #expect(try book.recipes.versions(bruschetta.id).count == 2)
        #expect(try book.recipes.ratings(bruschetta.id).map(\.value) == [4, 5])
        #expect(try book.recipes.notes(bruschetta.id).count == 1)
        #expect(try book.folders.all().count == 2)
        #expect(try book.preferences.load().unitPreference == .metric)

        // Still writable after migration.
        let added = try book.recipes.create(RecipeDraft(title: "New", ingredients: [IngredientDraft(name: "x")],
                                                        instructions: [InstructionDraft(text: "y")]))
        #expect(try book.recipes.detail(added.id) != nil)
        try book.close()
    }

    /// Fixture generator, gated by an environment variable so it never runs
    /// in CI. Populates a fresh v1 database with a little of everything.
    @Test(.enabled(if: ProcessInfo.processInfo.environment["KB_WRITE_SCHEMA_FIXTURE"] != nil))
    func writeSchemaV1Fixture() throws {
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
        try book.recipes.addNote(to: bruschetta.id, body: "Use ripe tomatoes.", cookedOn: nil)
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
