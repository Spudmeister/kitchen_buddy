import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, retention over 60 simulated days: the last 7
/// automatic snapshots, one per week for 4 weeks, every pre-migration
/// snapshot, recent manual/pre-import/pre-restore ones, and never the only
/// verified snapshot. Validates: Requirements 17.4
@Suite struct RetentionTests {
    static func synthetic(_ reason: Snapshot.Reason, at date: Date, verified: Bool = true) -> Snapshot {
        let name = Snapshot.fileName(createdAt: date, reason: reason)
        return Snapshot(url: URL(fileURLWithPath: "/tmp/\(name)"), reason: reason, createdAt: date, sizeBytes: 1,
                        verification: Snapshot.Verification(passed: verified, recipeCount: 1, verifiedAt: date))
    }

    @Test(arguments: 0..<20)
    func sixtyDaysOfRotation(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let start = Date(timeIntervalSince1970: 1_767_225_600)
        var kept: [Snapshot] = []
        var everMigration: [Snapshot.ID] = []
        var allAutomatic: [Snapshot] = []

        for day in 0..<60 {
            let midnight = start.addingTimeInterval(Double(day) * 86_400)
            var today: [Snapshot] = [Self.synthetic(.daily, at: midnight.addingTimeInterval(3_600))]
            for n in 0..<Int.random(in: 0...3, using: &rng) {
                today.append(Self.synthetic(.background, at: midnight.addingTimeInterval(Double(7_200 + n * 3_600))))
            }
            if Gen<Bool>.bool(probability: 0.1).run(&rng) { today.append(Self.synthetic(.manual, at: midnight.addingTimeInterval(50_000))) }
            if Gen<Bool>.bool(probability: 0.1).run(&rng) { today.append(Self.synthetic(.preImport, at: midnight.addingTimeInterval(60_000))) }
            if Gen<Bool>.bool(probability: 0.05).run(&rng) {
                let migration = Self.synthetic(.preMigration, at: midnight.addingTimeInterval(70_000))
                today.append(migration)
                everMigration.append(migration.id)
            }
            allAutomatic += today.filter { $0.reason.isAutomatic }
            let now = midnight.addingTimeInterval(80_000)

            for snapshot in today {
                kept.append(snapshot)
                let retained = RetentionPolicy.retained(kept, now: now)
                kept = kept.filter { retained.contains($0.id) }
            }

            let keptIDs = Set(kept.map(\.id))
            let recentAutomatic = allAutomatic.sorted { $0.createdAt > $1.createdAt }.prefix(RetentionPolicy.keepLastAutomatic)
            #expect(recentAutomatic.allSatisfy { keptIDs.contains($0.id) }, "seed \(seed) day \(day): last 7 automatic missing")
            for weeksBack in 0..<RetentionPolicy.keepWeeklyForWeeks {
                let target = RetentionPolicy.weekIndex(of: now) - weeksBack
                let existed = allAutomatic.contains { RetentionPolicy.weekIndex(of: $0.createdAt) == target }
                let keptOne = kept.contains { $0.reason.isAutomatic && RetentionPolicy.weekIndex(of: $0.createdAt) == target }
                #expect(!existed || keptOne, "seed \(seed) day \(day): no snapshot kept for week -\(weeksBack)")
            }
            #expect(everMigration.allSatisfy { keptIDs.contains($0) }, "seed \(seed) day \(day): pre-migration snapshot lost")
            #expect(kept.contains { $0.isVerified }, "seed \(seed) day \(day): no verified snapshot left")
            let bound = RetentionPolicy.keepLastAutomatic + RetentionPolicy.keepWeeklyForWeeks + everMigration.count
                + 4 * (RetentionPolicy.keepRecentPerReason + 8)
            #expect(kept.count <= bound, "seed \(seed) day \(day): \(kept.count) snapshots kept")
        }
    }

    @Test func neverDeletesTheOnlyVerifiedSnapshot() {
        let old = Self.synthetic(.background, at: Date(timeIntervalSince1970: 0))
        let newerUnverified = Self.synthetic(.background, at: Date(timeIntervalSince1970: 86_400 * 100), verified: false)
        let kept = RetentionPolicy.retained([old, newerUnverified], now: Date(timeIntervalSince1970: 86_400 * 400))
        #expect(kept.contains(old.id) && kept.contains(newerUnverified.id))
    }

    @Test func pruneDeletesFilesOnDisk() throws {
        let clock = ManualClock()
        let (book, layout) = try TestDatabase.onDisk(clock: clock.clock)
        defer { TestDatabase.remove(layout) }
        for _ in 0..<12 {
            try book.backups.snapshot(reason: .background)
            clock.advance(by: 86_400)
        }
        let remaining = try book.backups.snapshots().filter { $0.reason == .background }
        #expect((RetentionPolicy.keepLastAutomatic...RetentionPolicy.keepLastAutomatic + 2).contains(remaining.count), "7 recent + week anchors, got \(remaining.count)")
        #expect(remaining.allSatisfy { FileManager.default.fileExists(atPath: $0.url.path) })
    }
}
