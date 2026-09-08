import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Backups screen state: local snapshots with verification badges, damaged
/// databases, iCloud status, and the back-up / restore / share actions.
/// File work runs off the main thread.
///
/// Requirements: kitchen-buddy-ios 17.2–17.7, 18.4
@MainActor @Observable
public final class BackupsViewModel {
    public let environment: AppEnvironment
    public private(set) var snapshots: [Snapshot] = []
    public private(set) var damagedFiles: [URL] = []
    public private(set) var cloudStatus: CloudMirror.Status?
    public private(set) var cloudSnapshots: [Snapshot] = []
    public private(set) var isBusy = false
    public private(set) var busyMessage: String?
    public var message: String?
    /// Snapshot awaiting the user's restore confirmation.
    public var pendingRestore: Snapshot?
    public var isCloudPickerPresented = false

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public var liveRecipeCount: Int { (try? environment.book.recipes.count(includeArchived: true)) ?? 0 }

    public func refresh() {
        snapshots = (try? environment.book.backups.snapshots()) ?? []
        damagedFiles = (try? environment.book.backups.damagedFiles()) ?? []
        let cloud = environment.cloud
        Task.detached(priority: .utility) { [weak self] in
            let status = cloud.status()
            await MainActor.run { self?.cloudStatus = status }
        }
    }

    public func backUpNow() async {
        await perform("Backing up…") { book, _ in
            let snapshot = try book.backups.snapshot(reason: .manual)
            return "Backed up \(snapshot.verification?.recipeCount ?? 0) recipes and verified the copy."
        }
    }

    public func verify(_ snapshot: Snapshot) async {
        await perform("Verifying…") { book, _ in
            let verified = try book.backups.verify(snapshot)
            return verified.isVerified ? "Verified: \(verified.verification?.recipeCount ?? 0) recipes."
                : "Verification failed: \(verified.verification?.message ?? "unknown")"
        }
    }

    /// Runs after the confirmation dialog.
    public func restore(_ snapshot: Snapshot) async {
        await perform("Restoring…") { book, _ in
            let safety = try book.restore(from: snapshot)
            let count = try book.recipes.count(includeArchived: true)
            return "Restored \(count) recipes from \(snapshot.createdAt.formatted(date: .abbreviated, time: .shortened)). "
                + "A safety copy of the previous database was saved (\(safety.reason.displayName))."
        }
        environment.reloadPreferences()
    }

    public func copyToCloudNow() async {
        await perform("Copying to iCloud…") { book, cloud in
            guard let newest = try book.backups.newestVerified() else { throw BackupError.noVerifiedSnapshot }
            try cloud.mirror(newest)
            return "Copied \(newest.fileName) to iCloud Drive."
        }
    }

    public func loadCloudSnapshots() async {
        let cloud = environment.cloud
        isBusy = true
        busyMessage = "Checking iCloud…"
        defer { isBusy = false; busyMessage = nil }
        do {
            cloudSnapshots = try await Task.detached(priority: .userInitiated) { try cloud.cloudSnapshots() }.value
        } catch {
            message = "\(error)"
        }
    }

    public func restoreFromCloud(_ cloudSnapshot: Snapshot) async {
        await perform("Downloading from iCloud…") { book, cloud in
            let local = try cloud.fetch(cloudSnapshot)
            let verified = try book.backups.verify(local)
            guard verified.isVerified else {
                throw BackupError.snapshotFailedVerification(fileName: verified.fileName,
                                                             message: verified.verification?.message ?? "unknown")
            }
            _ = try book.restore(from: verified)
            let count = try book.recipes.count(includeArchived: true)
            return "Restored \(count) recipes from iCloud."
        }
        environment.reloadPreferences()
    }

    private func perform(_ progress: String,
                         _ work: @escaping @Sendable (RecipeBook, CloudMirror) throws -> String) async {
        isBusy = true
        busyMessage = progress
        defer { isBusy = false; busyMessage = nil }
        let book = environment.book
        let cloud = environment.cloud
        do {
            message = try await Task.detached(priority: .userInitiated) { try work(book, cloud) }.value
        } catch {
            message = "\(error)"
        }
        refresh()
    }
}
