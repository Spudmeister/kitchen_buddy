import Foundation
import GRDB
import KitchenCore

/// Launch-time integrity check and rename-aside recovery (ADR-003). The
/// damaged file is never modified or deleted: it is moved into `Damaged/`
/// with its journals so the owner can export it.
///
/// Requirements: kitchen-buddy-ios 17.5
enum Recovery {
    /// `PRAGMA quick_check` on the live file. A missing file is healthy (a
    /// new install); a file that cannot be opened is not.
    static func passesQuickCheck(_ url: URL) -> Bool {
        guard FileManager.default.fileExists(atPath: url.path) else { return true }
        do {
            let queue = try DatabaseQueue(path: url.path, configuration: DatabaseStack.configuration())
            defer { try? queue.close() }
            let result = try queue.read { db in try String.fetchAll(db, sql: "PRAGMA quick_check") }
            return result == ["ok"]
        } catch {
            return false
        }
    }

    static func damagedFileName(now: Date) -> String {
        "kb-\(Timestamp.stamp(now))-damaged.\(Snapshot.fileExtension)"
    }

    /// Moves the database and its journals into `Damaged/`; returns the new
    /// location of the main file.
    static func moveAside(_ layout: DatabaseStack.Layout, now: Date) throws -> URL {
        try DatabaseStack.prepareDirectory(layout.damagedURL)
        let name = damagedFileName(now: now)
        let target = layout.damagedURL.appendingPathComponent(name)
        try FileManager.default.moveItem(at: layout.databaseURL, to: target)
        for suffix in ["-wal", "-shm"] {
            let journal = URL(fileURLWithPath: layout.databaseURL.path + suffix)
            if FileManager.default.fileExists(atPath: journal.path) {
                try FileManager.default.moveItem(at: journal, to: URL(fileURLWithPath: target.path + suffix))
            }
        }
        return target
    }
}

extension Timestamp {
    private static let stampFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyyMMdd'T'HHmmssSSS'Z'"
        return formatter
    }()

    /// Compact file-name form of a date.
    static func stamp(_ date: Date) -> String { stampFormatter.string(from: date) }
}
