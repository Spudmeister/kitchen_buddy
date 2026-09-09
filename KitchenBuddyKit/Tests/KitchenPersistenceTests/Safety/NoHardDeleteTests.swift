import Testing
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, the database itself refuses destruction:
/// raw DELETEs on user-content tables and UPDATEs on immutable ones abort.
/// Validates: Requirements 3.5, 17.1 (ADR-003)
@Suite struct NoHardDeleteTests {
    static func seededBook() throws -> RecipeBook {
        let book = try TestDatabase.inMemory()
        let folder = try book.folders.create(name: "F", parentID: nil)
        var draft = try LegacyFixtures.recipesV1()[0]
        draft.folderID = folder.id
        let recipe = try book.recipes.create(draft)
        try book.recipes.rate(recipe.id, value: 3)
        try book.recipes.clearRating(recipe.id)
        try book.recipes.rate(recipe.id, value: 4)
        try book.recipes.addNote(to: recipe.id, body: "n", cookedOn: nil)
        try book.writer.write { db in
            try db.execute(sql: """
                INSERT INTO photos (id, recipe_id, file_name, width, height, sort_order, created_at)
                VALUES ('p1', ?, 'p1.jpg', 10, 10, 0, '2026-01-01T00:00:00.000Z')
                """, arguments: [recipe.id.rawValue])
        }
        return book
    }

    @Test(arguments: TableCounts.tables)
    func rawDeleteAborts(table: String) throws {
        let book = try Self.seededBook()
        let before = try TableCounts.snapshot(book)
        #expect(before.counts[table]! > 0, "fixture must populate \(table)")
        #expect(throws: DatabaseError.self) {
            try book.writer.write { db in try db.execute(sql: "DELETE FROM \(table)") }
        }
        #expect(try TableCounts.snapshot(book) == before)
    }

    @Test(arguments: [
        "UPDATE recipe_versions SET title = 'x'",
        "UPDATE ingredients SET name = 'x'",
        "UPDATE instructions SET text = 'x'",
        "UPDATE ratings SET value = 1",
        "UPDATE rating_clears SET cleared_at = 'x'",
        "UPDATE recipes SET parent_recipe_id = id",
        "UPDATE recipes SET parent_recipe_id = 'other'",
    ])
    func immutableRowsRejectUpdates(sql: String) throws {
        let book = try Self.seededBook()
        let titles = try book.writer.read { db in try String.fetchAll(db, sql: "SELECT title FROM recipe_versions") }
        #expect(throws: DatabaseError.self) {
            try book.writer.write { db in try db.execute(sql: sql) }
        }
        #expect(try book.writer.read { db in try String.fetchAll(db, sql: "SELECT title FROM recipe_versions") } == titles)
    }

    @Test func derivedTablesMayBeRewritten() throws {
        let book = try Self.seededBook()
        try book.writer.write { db in
            try db.execute(sql: "DELETE FROM recipe_tags")
            try db.execute(sql: "DELETE FROM preferences")
        }
        try book.rebuildSearchIndex()
        #expect(try book.recipes.count(includeArchived: true) == 1)
    }

    @Test func noPublicAPIDeletes() throws {
        let book = try Self.seededBook()
        let before = try TableCounts.snapshot(book)
        let id = try #require(try book.recipes.summaries(.all).first?.id)
        try book.recipes.archive(id)
        let folder = try #require(try book.folders.all().first)
        try book.folders.delete(folder.id)
        let note = try #require(try book.recipes.notes(id, includeDeleted: true).first)
        try book.recipes.deleteNote(note.id)
        #expect(try TableCounts.snapshot(book) == before)
    }
}
