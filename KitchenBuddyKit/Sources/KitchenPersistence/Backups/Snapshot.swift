import Foundation

/// One database snapshot file under `Backups/`:
/// `kb-20260908T142030123Z-manual.sqlite`. A snapshot that failed
/// verification is renamed `.bad` and kept (never deleted, never restored).
///
/// Requirements: kitchen-buddy-ios 17.2, 17.3
public struct Snapshot: Identifiable, Hashable, Sendable {
    public enum Reason: String, CaseIterable, Codable, Hashable, Sendable {
        case background
        case daily
        case preMigration = "pre-migration"
        case preImport = "pre-import"
        case preRestore = "pre-restore"
        case manual
        /// A copy brought back from iCloud Drive.
        case recovery

        /// Background and daily snapshots are the ones retention rotates.
        public var isAutomatic: Bool { self == .background || self == .daily }

        public var displayName: String {
            switch self {
            case .background: return "Automatic"
            case .daily: return "Daily"
            case .preMigration: return "Before update"
            case .preImport: return "Before import"
            case .preRestore: return "Before restore"
            case .manual: return "Manual"
            case .recovery: return "From iCloud"
            }
        }
    }

    public struct Verification: Hashable, Codable, Sendable {
        public let passed: Bool
        public let recipeCount: Int
        public let verifiedAt: Date
        public let message: String?

        public init(passed: Bool, recipeCount: Int, verifiedAt: Date, message: String? = nil) {
            self.passed = passed
            self.recipeCount = recipeCount
            self.verifiedAt = verifiedAt
            self.message = message
        }
    }

    public let url: URL
    public let reason: Reason
    public let createdAt: Date
    public let sizeBytes: Int64
    /// nil until verified.
    public var verification: Verification?

    public var id: String { url.lastPathComponent }
    public var fileName: String { url.lastPathComponent }
    public var isVerified: Bool { verification?.passed == true }
    /// Renamed aside after failing verification.
    public var isBad: Bool { url.pathExtension == "bad" }

    public init(url: URL, reason: Reason, createdAt: Date, sizeBytes: Int64, verification: Verification? = nil) {
        self.url = url
        self.reason = reason
        self.createdAt = createdAt
        self.sizeBytes = sizeBytes
        self.verification = verification
    }

    // MARK: File names

    static let filePrefix = "kb-"
    static let fileExtension = "sqlite"

    private static let stampFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyyMMdd'T'HHmmssSSS'Z'"
        return formatter
    }()

    static func fileName(createdAt: Date, reason: Reason) -> String {
        "\(filePrefix)\(stampFormatter.string(from: createdAt))-\(reason.rawValue).\(fileExtension)"
    }

    /// Parses `kb-<stamp>-<reason>.sqlite[.bad]`; nil for anything else.
    static func parse(fileName: String) -> (createdAt: Date, reason: Reason)? {
        var name = fileName
        if name.hasSuffix(".bad") { name.removeLast(4) }
        guard name.hasPrefix(filePrefix), name.hasSuffix(".\(fileExtension)") else { return nil }
        name.removeFirst(filePrefix.count)
        name.removeLast(fileExtension.count + 1)
        guard let dash = name.firstIndex(of: "-") else { return nil }
        let stamp = String(name[..<dash])
        let reasonText = String(name[name.index(after: dash)...])
        guard let date = stampFormatter.date(from: stamp), let reason = Reason(rawValue: reasonText) else { return nil }
        return (date, reason)
    }

    static func snapshot(at url: URL) -> Snapshot? {
        guard let parsed = parse(fileName: url.lastPathComponent) else { return nil }
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize).map(Int64.init) ?? 0
        return Snapshot(url: url, reason: parsed.reason, createdAt: parsed.createdAt, sizeBytes: size)
    }
}
