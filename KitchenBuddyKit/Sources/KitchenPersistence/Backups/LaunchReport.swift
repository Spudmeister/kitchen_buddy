import Foundation

/// What happened while opening the database at launch.
///
/// Requirements: kitchen-buddy-ios 17.5
public enum LaunchReport: Hashable, Sendable {
    case healthy
    /// Pending migrations ran; the snapshot taken first, if any.
    case migrated(preMigrationSnapshot: Snapshot?)
    /// The live file failed `quick_check`, was moved to `damagedFile`, and
    /// the newest verified snapshot (or nothing) was put in its place.
    case recovered(damagedFile: URL, restoredFrom: Snapshot?)

    public var needsAttention: Bool {
        if case .recovered = self { return true }
        return false
    }
}
