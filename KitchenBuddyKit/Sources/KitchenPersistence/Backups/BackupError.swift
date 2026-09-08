/// Failures of the snapshot, restore, and mirror machinery.
public enum BackupError: Error, Hashable, Sendable {
    /// The fresh snapshot did not pass `integrity_check` or lost recipes; it
    /// has been renamed `.bad`.
    case snapshotFailedVerification(fileName: String, message: String)
    /// Only verified snapshots may be restored or mirrored.
    case snapshotNotVerified(fileName: String)
    case snapshotMissing(fileName: String)
    case noVerifiedSnapshot
    case cloudUnavailable(reason: String)
    case cloudDownloadTimedOut(fileName: String)
}
