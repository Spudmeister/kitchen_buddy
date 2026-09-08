import Foundation
import KitchenCore

/// Copies the newest verified snapshot and the photo files into the app's
/// iCloud Drive container, visible in Files › iCloud Drive › Kitchen Buddy,
/// and brings a copy back for restore. The container URL is injected so
/// tests run against a plain directory.
///
/// Requirements: kitchen-buddy-ios 17.6
public final class CloudMirror: @unchecked Sendable {
    public static let containerIdentifier = "iCloud.net.puddleglum.kitchenbuddy"
    public static let keepInCloud = 2

    public struct Status: Hashable, Codable, Sendable {
        public var isAvailable: Bool
        public var unavailableReason: String?
        public var lastCopiedAt: Date?
        public var lastCopiedFileName: String?
        public var lastError: String?

        public init(isAvailable: Bool = false, unavailableReason: String? = nil, lastCopiedAt: Date? = nil,
                    lastCopiedFileName: String? = nil, lastError: String? = nil) {
            self.isAvailable = isAvailable
            self.unavailableReason = unavailableReason
            self.lastCopiedAt = lastCopiedAt
            self.lastCopiedFileName = lastCopiedFileName
            self.lastError = lastError
        }
    }

    let layout: DatabaseStack.Layout
    let clock: Clock
    private let containerURL: @Sendable () -> URL?
    private let lock = NSLock()

    /// The production container: `<iCloud container>/Documents`, which is
    /// what the Files app shows. `url(forUbiquityContainerIdentifier:)` can
    /// be slow the first time; call `status()` and `mirror` off the main thread.
    public static func ubiquityDocuments() -> URL? {
        FileManager.default.url(forUbiquityContainerIdentifier: containerIdentifier)?
            .appendingPathComponent("Documents", isDirectory: true)
    }

    public init(layout: DatabaseStack.Layout, clock: Clock = .system,
                containerURL: @escaping @Sendable () -> URL? = { CloudMirror.ubiquityDocuments() }) {
        self.layout = layout
        self.clock = clock
        self.containerURL = containerURL
    }

    // MARK: Status

    public func status() -> Status {
        var status = loadStatus()
        if containerURL() != nil {
            status.isAvailable = true
            status.unavailableReason = nil
        } else {
            status.isAvailable = false
            status.unavailableReason = "iCloud Drive is off, or no iCloud account is signed in."
        }
        return status
    }

    // MARK: Mirroring

    /// Copies `snapshot` (which must be verified) into the container's
    /// `Backups/`, keeps only the newest `keepInCloud` there, and copies new
    /// photo files. Returns the cloud URL of the snapshot.
    @discardableResult
    public func mirror(_ snapshot: Snapshot, photosFrom photosURL: URL? = nil) throws -> URL {
        guard snapshot.isVerified else { throw BackupError.snapshotNotVerified(fileName: snapshot.fileName) }
        do {
            let container = try requireContainer()
            let backups = container.appendingPathComponent("Backups", isDirectory: true)
            try FileManager.default.createDirectory(at: backups, withIntermediateDirectories: true)
            let target = backups.appendingPathComponent(snapshot.fileName)
            if !FileManager.default.fileExists(atPath: target.path) {
                try coordinatedCopy(from: snapshot.url, to: target)
            }
            try pruneCloud(backups)
            try mirrorPhotos(from: photosURL ?? layout.photosURL, into: container.appendingPathComponent("Photos", isDirectory: true))
            var status = loadStatus()
            status.lastCopiedAt = clock.now()
            status.lastCopiedFileName = snapshot.fileName
            status.lastError = nil
            try saveStatus(status)
            return target
        } catch {
            var status = loadStatus()
            status.lastError = "\(error)"
            try? saveStatus(status)
            throw error
        }
    }

    /// Snapshots present in the container, newest first, unverified.
    public func cloudSnapshots() throws -> [Snapshot] {
        let backups = try requireContainer().appendingPathComponent("Backups", isDirectory: true)
        guard FileManager.default.fileExists(atPath: backups.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(at: backups, includingPropertiesForKeys: [.fileSizeKey])
            .compactMap(Snapshot.snapshot(at:))
            .filter { !$0.isBad }
            .sorted { $0.createdAt > $1.createdAt }
    }

    /// Downloads (if needed) and copies a cloud snapshot into the local
    /// `Backups/` as a `recovery` snapshot, unverified; verify it through
    /// `BackupManager` before restoring.
    public func fetch(_ cloudSnapshot: Snapshot, timeout: TimeInterval = 120) throws -> Snapshot {
        try ensureDownloaded(cloudSnapshot.url, timeout: timeout)
        try DatabaseStack.prepareDirectory(layout.backupsURL)
        let name = Snapshot.fileName(createdAt: cloudSnapshot.createdAt, reason: .recovery)
        let local = layout.backupsURL.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: local.path) {
            try FileManager.default.removeItem(at: local)
        }
        var error: NSError?
        var copyError: Error?
        NSFileCoordinator().coordinate(readingItemAt: cloudSnapshot.url, options: [], error: &error) { url in
            do { try FileManager.default.copyItem(at: url, to: local) } catch { copyError = error }
        }
        if let error { throw error }
        if let copyError { throw copyError }
        guard let snapshot = Snapshot.snapshot(at: local) else { throw BackupError.snapshotMissing(fileName: name) }
        return snapshot
    }

    // MARK: Internals

    private func requireContainer() throws -> URL {
        guard let container = containerURL() else {
            throw BackupError.cloudUnavailable(reason: "iCloud Drive is off, or no iCloud account is signed in.")
        }
        try FileManager.default.createDirectory(at: container, withIntermediateDirectories: true)
        return container
    }

    private func coordinatedCopy(from source: URL, to target: URL) throws {
        var coordinationError: NSError?
        var copyError: Error?
        NSFileCoordinator().coordinate(writingItemAt: target, options: .forReplacing, error: &coordinationError) { url in
            do {
                let staging = url.appendingPathExtension("part")
                try? FileManager.default.removeItem(at: staging)
                try FileManager.default.copyItem(at: source, to: staging)
                _ = try FileManager.default.replaceItemAt(url, withItemAt: staging)
            } catch {
                copyError = error
            }
        }
        if let coordinationError { throw coordinationError }
        if let copyError { throw copyError }
    }

    private func pruneCloud(_ backups: URL) throws {
        let snapshots = try FileManager.default.contentsOfDirectory(at: backups, includingPropertiesForKeys: nil)
            .compactMap(Snapshot.snapshot(at:))
            .sorted { $0.createdAt > $1.createdAt }
        for stale in snapshots.dropFirst(Self.keepInCloud) {
            var error: NSError?
            NSFileCoordinator().coordinate(writingItemAt: stale.url, options: .forDeleting, error: &error) { url in
                try? FileManager.default.removeItem(at: url)
            }
        }
    }

    private func mirrorPhotos(from source: URL, into target: URL) throws {
        guard FileManager.default.fileExists(atPath: source.path) else { return }
        try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
        let files = try FileManager.default.contentsOfDirectory(at: source, includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey])
        for file in files {
            let values = try file.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
            guard values.isRegularFile == true else { continue }
            let destination = target.appendingPathComponent(file.lastPathComponent)
            let existingSize = try? destination.resourceValues(forKeys: [.fileSizeKey]).fileSize
            if existingSize == values.fileSize { continue }
            try coordinatedCopy(from: file, to: destination)
        }
    }

    private func ensureDownloaded(_ url: URL, timeout: TimeInterval) throws {
        let keys: Set<URLResourceKey> = [.ubiquitousItemDownloadingStatusKey, .isUbiquitousItemKey]
        guard let values = try? url.resourceValues(forKeys: keys), values.isUbiquitousItem == true else { return }
        if values.ubiquitousItemDownloadingStatus == .current { return }
        try FileManager.default.startDownloadingUbiquitousItem(at: url)
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let status = try? url.resourceValues(forKeys: keys).ubiquitousItemDownloadingStatus,
               status == .current || status == .downloaded { return }
            Thread.sleep(forTimeInterval: 0.5)
        }
        throw BackupError.cloudDownloadTimedOut(fileName: url.lastPathComponent)
    }

    // MARK: Status file

    private var statusURL: URL { layout.root.appendingPathComponent("cloud-mirror.json") }

    private func loadStatus() -> Status {
        lock.lock()
        defer { lock.unlock() }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let data = try? Data(contentsOf: statusURL), let status = try? decoder.decode(Status.self, from: data) else {
            return Status()
        }
        return status
    }

    private func saveStatus(_ status: Status) throws {
        lock.lock()
        defer { lock.unlock() }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try encoder.encode(status).write(to: statusURL, options: .atomic)
    }
}
