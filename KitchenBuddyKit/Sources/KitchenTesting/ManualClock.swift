import Foundation
import KitchenPersistence

/// A clock tests move by hand, for retention and trigger simulations.
public final class ManualClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    public init(start: Date = Date(timeIntervalSince1970: 1_767_225_600)) {
        current = start
    }

    public var now: Date {
        lock.lock()
        defer { lock.unlock() }
        return current
    }

    public func advance(by interval: TimeInterval) {
        lock.lock()
        defer { lock.unlock() }
        current = current.addingTimeInterval(interval)
    }

    public var clock: Clock { Clock { self.now } }
}
