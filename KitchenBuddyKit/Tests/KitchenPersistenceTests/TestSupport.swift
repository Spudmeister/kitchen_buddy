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
