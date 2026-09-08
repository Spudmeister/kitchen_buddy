import Foundation

/// Which snapshots to keep. Pure, so the 60-day simulation can test it
/// directly. Never returns an empty set when a verified snapshot exists.
///
/// Requirements: kitchen-buddy-ios 17.4
public enum RetentionPolicy {
    public static let keepLastAutomatic = 7
    public static let keepWeeklyForWeeks = 4
    public static let keepRecentPerReason = 3
    public static let recentWindow: TimeInterval = 7 * 86_400
    public static let week: TimeInterval = 7 * 86_400

    /// Ids of the snapshots to keep. `.bad` files are never candidates for
    /// deletion (they are evidence), and neither is anything unverified.
    public static func retained(_ snapshots: [Snapshot], now: Date) -> Set<Snapshot.ID> {
        var keep = Set<Snapshot.ID>()
        let live = snapshots.filter { !$0.isBad }
        for snapshot in live where !snapshot.isVerified { keep.insert(snapshot.id) }

        let automatic = live.filter { $0.reason.isAutomatic }.sorted { $0.createdAt > $1.createdAt }
        for snapshot in automatic.prefix(keepLastAutomatic) { keep.insert(snapshot.id) }

        // Fixed, epoch-aligned weeks (not sliding windows): the oldest snapshot
        // of a week stays its anchor for as long as the week is in range.
        let currentWeek = weekIndex(of: now)
        for weekBack in 0..<keepWeeklyForWeeks {
            let target = currentWeek - weekBack
            if let first = automatic.filter({ weekIndex(of: $0.createdAt) == target }).min(by: { $0.createdAt < $1.createdAt }) {
                keep.insert(first.id)
            }
        }

        for snapshot in live where snapshot.reason == .preMigration { keep.insert(snapshot.id) }

        for reason in [Snapshot.Reason.manual, .preImport, .preRestore, .recovery] {
            let ofReason = live.filter { $0.reason == reason }.sorted { $0.createdAt > $1.createdAt }
            for snapshot in ofReason.prefix(keepRecentPerReason) { keep.insert(snapshot.id) }
            for snapshot in ofReason where now.timeIntervalSince(snapshot.createdAt) <= recentWindow { keep.insert(snapshot.id) }
        }

        if let newest = live.filter(\.isVerified).max(by: { $0.createdAt < $1.createdAt }) { keep.insert(newest.id) }
        return keep
    }

    /// Whole weeks since the Unix epoch.
    public static func weekIndex(of date: Date) -> Int {
        Int((date.timeIntervalSince1970 / week).rounded(.down))
    }
}
