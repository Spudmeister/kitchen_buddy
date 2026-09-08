import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, the iCloud Drive mirror against a temporary
/// container directory. Validates: Requirements 17.6
@Suite struct CloudMirrorTests {
    @Test func mirrorsNewestSnapshotAndPhotosAndKeepsTwo() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let container = layout.root.appendingPathComponent("cloud", isDirectory: true)
        let mirror = CloudMirror(layout: layout, clock: TestDatabase.clock(), containerURL: { container })
        try Data("jpeg".utf8).write(to: layout.photosURL.appendingPathComponent("a.jpg"))

        #expect(mirror.status().isAvailable)
        #expect(mirror.status().lastCopiedAt == nil)
        var snapshots: [Snapshot] = []
        for _ in 0..<3 {
            _ = try book.recipes.create(RecipeDraft(title: "T", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
            let snapshot = try book.backups.snapshot(reason: .manual)
            snapshots.append(snapshot)
            let cloud = try mirror.mirror(snapshot)
            #expect(FileManager.default.fileExists(atPath: cloud.path))
        }
        let inCloud = try mirror.cloudSnapshots()
        #expect(inCloud.map(\.fileName) == snapshots.suffix(2).reversed().map(\.fileName))
        #expect(FileManager.default.fileExists(atPath: container.appendingPathComponent("Photos/a.jpg").path))
        let status = mirror.status()
        #expect(status.lastCopiedFileName == snapshots.last?.fileName && status.lastCopiedAt != nil && status.lastError == nil)

        // Bring one back and restore it.
        let fetched = try mirror.fetch(inCloud[1])
        #expect(fetched.reason == .recovery && fetched.verification == nil)
        let verified = try book.backups.verify(fetched)
        #expect(verified.isVerified && verified.verification?.recipeCount == 2)
        try book.restore(from: verified)
        #expect(try book.recipes.count(includeArchived: false) == 2)
        try book.close()
    }

    @Test func unavailableContainerIsReportedNotThrownAtStatus() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let mirror = CloudMirror(layout: layout, clock: TestDatabase.clock(), containerURL: { nil })
        let status = mirror.status()
        #expect(!status.isAvailable && status.unavailableReason != nil)
        let snapshot = try book.backups.snapshot(reason: .manual)
        #expect(throws: BackupError.self) { try mirror.mirror(snapshot) }
        #expect(mirror.status().lastError != nil)
        let unverified = Snapshot(url: snapshot.url, reason: .manual, createdAt: snapshot.createdAt, sizeBytes: 1)
        #expect(throws: BackupError.snapshotNotVerified(fileName: snapshot.fileName)) { try mirror.mirror(unverified) }
    }
}
