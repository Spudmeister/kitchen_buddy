import Foundation
import GRDB
import KitchenCore

/// Snapshots of the live database: `VACUUM INTO` a fresh file, verify it
/// (`integrity_check`, recipe count not below live), record the result, and
/// prune by `RetentionPolicy`. Also performs restores (pre-restore snapshot
/// first, atomic file swap, reopen). Nothing here deletes anything except
/// snapshots the retention policy retires.
///
/// Requirements: kitchen-buddy-ios 17.2, 17.3, 17.4, 17.7 (ADR-003)
public final class BackupManager: @unchecked Sendable {
    public enum Trigger: Sendable { case background, daily }

    public static let minimumBackgroundInterval: TimeInterval = 3_600
    public static let dailyInterval: TimeInterval = 86_400

    let layout: DatabaseStack.Layout
    let handle: DatabaseHandle
    let clock: Clock
    private let lock = NSLock()
    private var changesAtLastSnapshot: Int?

    init(layout: DatabaseStack.Layout, handle: DatabaseHandle, clock: Clock) {
        self.layout = layout
        self.handle = handle
        self.clock = clock
        // Baseline: rows written so far on this connection (migrations, index
        // rebuilds) are not user changes.
        changesAtLastSnapshot = try? handle.writer.writeWithoutTransaction { db in db.totalChangesCount }
    }

    // MARK: Listing

    /// Every snapshot file, newest first, with cached verification results.
    public func snapshots() throws -> [Snapshot] {
        try Self.snapshots(in: layout)
    }

    static func snapshots(in layout: DatabaseStack.Layout) throws -> [Snapshot] {
        try DatabaseStack.prepareDirectory(layout.backupsURL)
        let manifest = SnapshotManifest.load(from: layout.backupsURL)
        let urls = try FileManager.default.contentsOfDirectory(at: layout.backupsURL, includingPropertiesForKeys: [.fileSizeKey])
        return urls.compactMap(Snapshot.snapshot(at:))
            .map { snapshot in
                var copy = snapshot
                copy.verification = manifest.verifications[snapshot.fileName]
                if snapshot.isBad, copy.verification == nil {
                    copy.verification = Snapshot.Verification(passed: false, recipeCount: 0, verifiedAt: snapshot.createdAt, message: "Renamed aside")
                }
                return copy
            }
            .sorted { $0.createdAt > $1.createdAt }
    }

    /// The newest snapshot that passes verification, verifying unverified
    /// ones as needed (newest first, stopping at the first success).
    public func newestVerified() throws -> Snapshot? {
        try Self.newestVerified(in: layout, liveRecipeCount: try liveRecipeCount(), clock: clock)
    }

    static func newestVerified(in layout: DatabaseStack.Layout, liveRecipeCount: Int?, clock: Clock) throws -> Snapshot? {
        for snapshot in try snapshots(in: layout) where !snapshot.isBad {
            if snapshot.isVerified { return snapshot }
            if snapshot.verification == nil,
               let verified = try? verify(snapshot, in: layout, liveRecipeCount: liveRecipeCount, clock: clock),
               verified.isVerified {
                return verified
            }
        }
        return nil
    }

    /// Databases renamed aside at launch after failing `quick_check`.
    public func damagedFiles() throws -> [URL] {
        try DatabaseStack.prepareDirectory(layout.damagedURL)
        return try FileManager.default.contentsOfDirectory(at: layout.damagedURL, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == Snapshot.fileExtension }
            .sorted { $0.lastPathComponent > $1.lastPathComponent }
    }

    // MARK: Taking snapshots

    /// Writes, fsyncs, verifies, records, and prunes. Throws (and renames the
    /// file `.bad`) when verification fails; older snapshots are then left
    /// alone.
    @discardableResult
    public func snapshot(reason: Snapshot.Reason) throws -> Snapshot {
        try DatabaseStack.prepareDirectory(layout.backupsURL)
        let now = clock.now()
        var url = layout.backupsURL.appendingPathComponent(Snapshot.fileName(createdAt: now, reason: reason))
        while FileManager.default.fileExists(atPath: url.path) {
            url = layout.backupsURL.appendingPathComponent(
                Snapshot.fileName(createdAt: now.addingTimeInterval(0.001), reason: reason))
        }
        let changes = try handle.writer.writeWithoutTransaction { db -> Int in
            try db.execute(sql: "VACUUM INTO ?", arguments: [url.path])
            return db.totalChangesCount
        }
        try Self.fsync(url)
        guard let written = Snapshot.snapshot(at: url) else { throw BackupError.snapshotMissing(fileName: url.lastPathComponent) }

        let verified = try Self.verify(written, in: layout, liveRecipeCount: try liveRecipeCount(), clock: clock)
        guard verified.isVerified else {
            throw BackupError.snapshotFailedVerification(fileName: verified.fileName,
                                                         message: verified.verification?.message ?? "unknown")
        }
        lock.lock()
        changesAtLastSnapshot = changes
        lock.unlock()
        try prune()
        return verified
    }

    /// Background: only with changes since the last snapshot and at least an
    /// hour after it. Daily: when no verified snapshot exists from the last
    /// 24 hours.
    @discardableResult
    public func snapshotIfDue(_ trigger: Trigger) throws -> Snapshot? {
        let now = clock.now()
        let newest = try snapshots().first { !$0.isBad && $0.verification?.passed != false }
        let age = newest.map { now.timeIntervalSince($0.createdAt) } ?? .infinity
        switch trigger {
        case .background:
            guard try hasChangesSinceLastSnapshot(), age >= Self.minimumBackgroundInterval else { return nil }
            return try snapshot(reason: .background)
        case .daily:
            guard age >= Self.dailyInterval else { return nil }
            return try snapshot(reason: .daily)
        }
    }

    /// True when rows were written through this connection since the last
    /// snapshot (or since open, when none was taken this session).
    public func hasChangesSinceLastSnapshot() throws -> Bool {
        let changes = try handle.writer.writeWithoutTransaction { db in db.totalChangesCount }
        lock.lock()
        defer { lock.unlock() }
        guard let baseline = changesAtLastSnapshot else { return true }
        return changes != baseline
    }

    // MARK: Verification

    /// Verifies an existing snapshot: `integrity_check` and a recipe count.
    /// The count is not compared with the live database here — an older
    /// snapshot legitimately holds fewer recipes; that comparison guards
    /// freshly written snapshots only.
    @discardableResult
    public func verify(_ snapshot: Snapshot) throws -> Snapshot {
        try Self.verify(snapshot, in: layout, liveRecipeCount: nil, clock: clock)
    }

    /// Opens the file read-only, runs `integrity_check`, counts recipes, and
    /// (when given) checks the count against the live one. A failure renames
    /// the file `.bad`. The result is recorded in the manifest either way.
    static func verify(_ snapshot: Snapshot, in layout: DatabaseStack.Layout,
                       liveRecipeCount: Int?, clock: Clock) throws -> Snapshot {
        guard !snapshot.isBad else { return snapshot }
        let (passed, count, message) = check(fileAt: snapshot.url, minimumRecipeCount: liveRecipeCount)
        let verification = Snapshot.Verification(passed: passed, recipeCount: count, verifiedAt: clock.now(), message: message)

        var result = snapshot
        result.verification = verification
        if !passed {
            let badURL = snapshot.url.appendingPathExtension("bad")
            try? FileManager.default.moveItem(at: snapshot.url, to: badURL)
            result = Snapshot(url: badURL, reason: snapshot.reason, createdAt: snapshot.createdAt,
                              sizeBytes: snapshot.sizeBytes, verification: verification)
        }
        var manifest = SnapshotManifest.load(from: layout.backupsURL)
        manifest.verifications[result.fileName] = verification
        try manifest.save(to: layout.backupsURL)
        return result
    }

    /// `integrity_check` plus recipe count on any SQLite file. Never throws:
    /// an unreadable file is simply a failed check.
    static func check(fileAt url: URL, minimumRecipeCount: Int?) -> (passed: Bool, recipeCount: Int, message: String?) {
        var configuration = Configuration()
        configuration.readonly = true
        do {
            let queue = try DatabaseQueue(path: url.path, configuration: configuration)
            defer { try? queue.close() }
            return try queue.read { db in
                let integrity = try String.fetchAll(db, sql: "PRAGMA integrity_check")
                guard integrity == ["ok"] else {
                    return (false, 0, integrity.joined(separator: "; "))
                }
                let count = (try? Int.fetchOne(db, sql: "SELECT COUNT(*) FROM recipes")) ?? 0
                if let minimum = minimumRecipeCount, count < minimum {
                    return (false, count, "snapshot holds \(count) recipes, live database holds \(minimum)")
                }
                return (true, count, nil)
            }
        } catch {
            return (false, 0, "\(error)")
        }
    }

    // MARK: Retention

    /// Deletes the snapshots `RetentionPolicy` retires. Returns what was removed.
    @discardableResult
    public func prune() throws -> [Snapshot] {
        let all = try snapshots()
        let keep = RetentionPolicy.retained(all, now: clock.now())
        var removed: [Snapshot] = []
        var manifest = SnapshotManifest.load(from: layout.backupsURL)
        for snapshot in all where !snapshot.isBad && !keep.contains(snapshot.id) {
            try FileManager.default.removeItem(at: snapshot.url)
            manifest.verifications[snapshot.fileName] = nil
            removed.append(snapshot)
        }
        if !removed.isEmpty { try manifest.save(to: layout.backupsURL) }
        return removed
    }

    // MARK: Restore

    /// Snapshots the live database (`pre-restore`), then atomically replaces
    /// it with a verified copy of `snapshot` and reopens through `reopen`.
    /// Any failure before the swap leaves the live database untouched; a
    /// failure to reopen the new file falls back to reopening the old one.
    func restore(_ snapshot: Snapshot, reopen: () throws -> any DatabaseWriter) throws -> Snapshot {
        let verified = try verify(snapshot)
        guard verified.isVerified else { throw BackupError.snapshotNotVerified(fileName: snapshot.fileName) }
        let preRestore = try self.snapshot(reason: .preRestore)

        try handle.close()
        do {
            let staging = layout.databaseURL.appendingPathExtension("restoring")
            try? FileManager.default.removeItem(at: staging)
            try FileManager.default.copyItem(at: verified.url, to: staging)
            try Self.fsync(staging)
            _ = try FileManager.default.replaceItemAt(layout.databaseURL, withItemAt: staging)
            try Self.moveAsideJournals(of: layout.databaseURL, to: layout.damagedURL, now: clock.now())
            handle.replace(with: try reopen())
        } catch {
            handle.replace(with: try reopen())
            throw error
        }
        lock.lock()
        changesAtLastSnapshot = nil
        lock.unlock()
        return preRestore
    }

    // MARK: Helpers

    func liveRecipeCount() throws -> Int? {
        guard handle.isOpen else { return nil }
        return try handle.writer.read { db in try? Int.fetchOne(db, sql: "SELECT COUNT(*) FROM recipes") }
    }

    /// `VACUUM INTO` does not fsync; do it before trusting the file.
    static func fsync(_ url: URL) throws {
        let file = try FileHandle(forWritingTo: url)
        defer { try? file.close() }
        try file.synchronize()
    }

    /// Stray `-wal` / `-shm` files next to a database file are moved into
    /// `Damaged/` (never deleted) so they cannot be applied to a different
    /// database file.
    static func moveAsideJournals(of databaseURL: URL, to directory: URL, now: Date) throws {
        for suffix in ["-wal", "-shm"] {
            let journal = URL(fileURLWithPath: databaseURL.path + suffix)
            guard FileManager.default.fileExists(atPath: journal.path) else { continue }
            try DatabaseStack.prepareDirectory(directory)
            let target = directory.appendingPathComponent(Recovery.damagedFileName(now: now) + suffix)
            try FileManager.default.moveItem(at: journal, to: target)
        }
    }
}
