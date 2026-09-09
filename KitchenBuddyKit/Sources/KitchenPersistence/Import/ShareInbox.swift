import Foundation

/// The App Group queue the Share Extension writes URLs into (ADR-005).
/// The app drains it on becoming active and opens the import sheet.
///
/// Requirements: kitchen-buddy-ios 12.5
public struct ShareInbox: @unchecked Sendable {
    public static let appGroup = "group.net.puddleglum.kitchenbuddy"
    public static let queueKey = "pendingImportURLs"

    private let defaults: UserDefaults?

    public init(defaults: UserDefaults? = UserDefaults(suiteName: ShareInbox.appGroup)) {
        self.defaults = defaults
    }

    public func pending() -> [URL] {
        (defaults?.stringArray(forKey: Self.queueKey) ?? []).compactMap(URL.init(string:))
    }

    /// Removes and returns the oldest queued URL.
    public func takeNext() -> URL? {
        guard let defaults else { return nil }
        var queue = defaults.stringArray(forKey: Self.queueKey) ?? []
        guard !queue.isEmpty else { return nil }
        let first = queue.removeFirst()
        defaults.set(queue, forKey: Self.queueKey)
        return URL(string: first)
    }

    public func enqueue(_ url: URL) {
        guard let defaults else { return }
        var queue = defaults.stringArray(forKey: Self.queueKey) ?? []
        if !queue.contains(url.absoluteString) { queue.append(url.absoluteString) }
        defaults.set(queue, forKey: Self.queueKey)
    }
}
