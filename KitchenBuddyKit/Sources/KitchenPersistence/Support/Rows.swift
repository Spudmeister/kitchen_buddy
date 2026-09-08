import Foundation
import GRDB
import KitchenCore

/// Column readers shared by the stores. Timestamps are ISO-8601 text
/// (`Timestamp`), fractions are integer pairs, ids are `Tagged` strings.
extension Row {
    func timestamp(_ column: String) -> Date {
        Timestamp.date(self[column]) ?? Date(timeIntervalSince1970: 0)
    }

    func optionalTimestamp(_ column: String) -> Date? {
        (self[column] as String?).flatMap(Timestamp.date)
    }

    func id<Entity>(_ column: String) -> Tagged<Entity> {
        Tagged(self[column] as String)
    }

    func optionalID<Entity>(_ column: String) -> Tagged<Entity>? {
        (self[column] as String?).map(Tagged.init(rawValue:))
    }

    func fraction(numerator: String, denominator: String) -> Fraction? {
        guard let n = self[numerator] as Int?, let d = self[denominator] as Int?, d > 0 else { return nil }
        return Fraction(n, d)
    }
}

extension Date {
    /// Storage form.
    var sql: String { Timestamp.string(self) }
}

extension Optional where Wrapped == Date {
    var sql: String? { self.map(Timestamp.string) }
}
