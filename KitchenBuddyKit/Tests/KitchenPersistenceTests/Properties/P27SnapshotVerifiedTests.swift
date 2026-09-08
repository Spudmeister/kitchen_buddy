import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 27: Snapshot verified — a snapshot passes `integrity_check`,
/// holds at least as many recipes as the live database, is recorded as
/// verified, and opening it yields the same recipe set. Validates: Requirements 17.3
@Suite struct P27SnapshotVerifiedTests {
    @Test(arguments: 0..<40)
    func snapshotMatchesLive(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let driver = BookDriver(book: book)
        try driver.apply(BookOperation.sequence(length: 3...25).run(&rng))
        let live = try BookFingerprint.of(book)
        let liveCount = try book.recipes.count(includeArchived: true)

        let snapshot = try book.backups.snapshot(reason: Gen<Snapshot.Reason>.element(of: Snapshot.Reason.allCases).run(&rng))
        #expect(snapshot.isVerified, "seed \(seed)")
        #expect(snapshot.verification?.recipeCount == liveCount, "seed \(seed)")
        #expect(try book.backups.snapshots().first { $0.id == snapshot.id }?.isVerified == true, "seed \(seed)")
        #expect(BackupManager.check(fileAt: snapshot.url, minimumRecipeCount: liveCount).passed, "seed \(seed)")
        #expect(try BookFingerprint.of(snapshotAt: snapshot.url) == live, "seed \(seed)")
        try book.close()
    }
}
