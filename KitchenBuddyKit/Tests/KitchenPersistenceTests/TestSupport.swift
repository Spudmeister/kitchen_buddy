import Foundation
import GRDB
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Row counts of every user-content table, for the non-destruction properties.
struct TableCounts: Equatable, CustomStringConvertible {
    static let tables = ["recipes", "recipe_versions", "ingredients", "instructions", "ratings",
                         "recipe_notes", "folders", "tags", "photos"]
    var counts: [String: Int]

    static func snapshot(_ book: RecipeBook) throws -> TableCounts {
        try book.writer.read { db in
            var counts: [String: Int] = [:]
            for table in tables {
                counts[table] = try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM \(table)") ?? 0
            }
            return TableCounts(counts: counts)
        }
    }

    /// True when no table shrank.
    func isMonotonic(from earlier: TableCounts) -> Bool {
        Self.tables.allSatisfy { (counts[$0] ?? 0) >= (earlier.counts[$0] ?? 0) }
    }

    var description: String {
        Self.tables.map { "\($0)=\(counts[$0] ?? 0)" }.joined(separator: " ")
    }
}

extension RecipeBook {
    /// Every `recipe_search` row keyed by recipe id, as raw database values.
    func searchRows() throws -> [String: [String: DatabaseValue]] {
        try writer.read { db in
            var result: [String: [String: DatabaseValue]] = [:]
            for row in try Row.fetchAll(db, sql: "SELECT * FROM recipe_search") {
                var values: [String: DatabaseValue] = [:]
                for (column, value) in row { values[column] = value }
                result[row["recipe_id"]] = values
            }
            return result
        }
    }
}

/// Words the FTS tokenizer would see in `text`.
func searchWords(in text: String) -> [String] {
    text.split { !($0.isLetter || $0.isNumber) }.map(String.init).filter { $0.count >= 2 }
}

/// Every user-visible row in the database, for state equality across
/// snapshot and restore. Rowids are excluded (they may legitimately differ
/// after `VACUUM INTO`); `recipe_search` is included minus its rowid.
struct BookFingerprint: Equatable {
    static let tables = TableCounts.tables + ["recipe_tags", "preferences", "recipe_search"]
    /// Canonical row strings (columns sorted by name), sorted, per table.
    var rows: [String: [String]]

    static func of(_ book: RecipeBook) throws -> BookFingerprint {
        try book.writer.read { db in
            var rows: [String: [String]] = [:]
            for table in tables {
                let fetched = try Row.fetchAll(db, sql: "SELECT * FROM \(table)").map { row -> String in
                    row.map { ($0, $1) }.filter { $0.0 != "rowid" }.sorted { $0.0 < $1.0 }
                        .map { "\($0.0)=\($0.1)" }.joined(separator: "|")
                }
                rows[table] = fetched.sorted()
            }
            return BookFingerprint(rows: rows)
        }
    }

    /// Opens a snapshot file in a scratch layout and fingerprints it.
    static func of(snapshotAt url: URL) throws -> BookFingerprint {
        let layout = TestDatabase.temporaryLayout()
        defer { TestDatabase.remove(layout) }
        try FileManager.default.createDirectory(at: layout.root, withIntermediateDirectories: true)
        try FileManager.default.copyItem(at: url, to: layout.databaseURL)
        let book = try RecipeBook.open(layout, clock: TestDatabase.clock())
        defer { try? book.close() }
        return try of(book)
    }
}

/// Ways a database file can be damaged, for the corruption properties.
enum Corruption: CaseIterable {
    case zeroHeader, garbageHeader, truncate, scribble, replaceWithText, scribbleMany

    func apply(to url: URL, rng: inout SeededRandomSource) throws {
        var bytes = [UInt8](try Data(contentsOf: url))
        switch self {
        case .zeroHeader:
            for i in 0..<min(100, bytes.count) { bytes[i] = 0 }
        case .garbageHeader:
            for i in 0..<min(100, bytes.count) { bytes[i] = UInt8.random(in: 0...255, using: &rng) }
        case .truncate:
            bytes = Array(bytes.prefix(Int.random(in: 0..<max(1, bytes.count / 2), using: &rng)))
        case .scribble:
            let start = Int.random(in: 0..<max(1, bytes.count - 64), using: &rng)
            for i in start..<min(bytes.count, start + 64) { bytes[i] = UInt8.random(in: 0...255, using: &rng) }
        case .replaceWithText:
            bytes = Array("this is not a database".utf8)
        case .scribbleMany:
            for _ in 0..<20 {
                let i = Int.random(in: 0..<bytes.count, using: &rng)
                bytes[i] = UInt8.random(in: 0...255, using: &rng)
            }
        }
        try Data(bytes).write(to: url)
    }
}
