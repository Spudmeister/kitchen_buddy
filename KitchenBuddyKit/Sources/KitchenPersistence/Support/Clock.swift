import Foundation
import KitchenCore

/// The stores' source of "now". Injectable so tests and fixture generation
/// are deterministic. Every date is normalized to what storage reads back.
public struct Clock: Sendable {
    private let source: @Sendable () -> Date

    public init(_ source: @escaping @Sendable () -> Date) { self.source = source }

    public static let system = Clock { Date() }

    /// A clock that starts at `start` and advances by `step` on every call,
    /// so ordering by timestamp is deterministic in tests.
    public static func stepping(from start: Date, by step: TimeInterval = 1) -> Clock {
        let state = SteppingState(next: start, step: step)
        return Clock { state.tick() }
    }

    public func now() -> Date { Timestamp.normalize(source()) }
}

private final class SteppingState: @unchecked Sendable {
    private let lock = NSLock()
    private var next: Date
    private let step: TimeInterval

    init(next: Date, step: TimeInterval) {
        self.next = next
        self.step = step
    }

    func tick() -> Date {
        lock.lock()
        defer { lock.unlock() }
        let value = next
        next = next.addingTimeInterval(step)
        return value
    }
}
