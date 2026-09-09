import Foundation
import OSLog

/// `os_signpost` intervals around the hot paths (search, snapshot) for the
/// Instruments performance pass. Requirements: kitchen-buddy-ios 6.5
enum Signpost {
    static let log = OSLog(subsystem: "net.puddleglum.kitchenbuddy", category: "Performance")

    static func measure<T>(_ name: StaticString, _ work: () throws -> T) rethrows -> T {
        let id = OSSignpostID(log: log)
        os_signpost(.begin, log: log, name: name, signpostID: id)
        defer { os_signpost(.end, log: log, name: name, signpostID: id) }
        return try work()
    }
}
