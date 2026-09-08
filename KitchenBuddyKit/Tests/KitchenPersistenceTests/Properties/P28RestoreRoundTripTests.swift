import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 28: Restore round-trip and safety — a pre-restore snapshot is
/// taken, the restored state equals the snapshot's, and a failed restore
/// leaves the database untouched. Validates: Requirements 17.7
@Suite struct P28RestoreRoundTripTests {
    @Test(arguments: 0..<40)
    func restoreReturnsToSnapshotState(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let driver = BookDriver(book: book)
        try driver.apply(BookOperation.sequence(length: 3...20).run(&rng))
        let stateS = try BookFingerprint.of(book)
        let snapshot = try book.backups.snapshot(reason: .manual)

        try driver.apply(BookOperation.sequence(length: 1...20).run(&rng))
        let stateBeforeRestore = try BookFingerprint.of(book)

        let preRestore = try book.restore(from: snapshot)
        #expect(preRestore.reason == .preRestore && preRestore.isVerified, "seed \(seed)")
        #expect(try BookFingerprint.of(book) == stateS, "seed \(seed)")
        #expect(try BookFingerprint.of(snapshotAt: preRestore.url) == stateBeforeRestore, "seed \(seed)")

        // A damaged candidate is refused and changes nothing.
        let fakeURL = layout.backupsURL.appendingPathComponent(Snapshot.fileName(createdAt: Date(), reason: .manual))
        try Data("not a database".utf8).write(to: fakeURL)
        let fake = try #require(Snapshot.snapshot(at: fakeURL))
        #expect(throws: BackupError.self) { try book.restore(from: fake) }
        #expect(try BookFingerprint.of(book) == stateS, "seed \(seed)")
        // The store still works after both.
        _ = try book.recipes.create(RecipeGen.draft.run(&rng))
        try book.close()
    }
}
