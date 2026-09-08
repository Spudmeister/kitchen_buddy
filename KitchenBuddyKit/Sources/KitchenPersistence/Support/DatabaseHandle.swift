import Foundation
import GRDB

/// The one place that holds the open database. Stores read `writer` on
/// every call instead of capturing the pool, so a restore can close the
/// file, swap it, and reopen without rebuilding the stores.
final class DatabaseHandle: @unchecked Sendable {
    private let lock = NSLock()
    private var current: (any DatabaseWriter)?

    init(_ writer: any DatabaseWriter) {
        current = writer
    }

    /// Traps if the database has been closed: using a closed book is a
    /// programming error, never a runtime condition.
    var writer: any DatabaseWriter {
        lock.lock()
        defer { lock.unlock() }
        guard let current else { preconditionFailure("The recipe database is closed") }
        return current
    }

    var isOpen: Bool {
        lock.lock()
        defer { lock.unlock() }
        return current != nil
    }

    func close() throws {
        lock.lock()
        defer { lock.unlock() }
        try current?.close()
        current = nil
    }

    func replace(with writer: any DatabaseWriter) {
        lock.lock()
        defer { lock.unlock() }
        current = writer
    }
}
