import Foundation

/// SplitMix64 — a small, fast, seedable generator so every property test is
/// reproducible from the seed in its failure message.
public struct SeededRandomSource: RandomNumberGenerator, Sendable {
    private var state: UInt64

    public init(seed: UInt64) { state = seed }

    public mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

/// A tiny generator combinator library for property tests (no external
/// dependency; see design.md "Testing").
public struct Gen<Value> {
    public let run: (inout SeededRandomSource) -> Value

    public init(_ run: @escaping (inout SeededRandomSource) -> Value) { self.run = run }

    public func map<T>(_ transform: @escaping (Value) -> T) -> Gen<T> {
        Gen<T> { rng in transform(self.run(&rng)) }
    }

    public func flatMap<T>(_ transform: @escaping (Value) -> Gen<T>) -> Gen<T> {
        Gen<T> { rng in transform(self.run(&rng)).run(&rng) }
    }

    public static func always(_ value: Value) -> Gen<Value> { Gen { _ in value } }

    public static func int(in range: ClosedRange<Int>) -> Gen<Int> {
        Gen<Int> { rng in Int.random(in: range, using: &rng) }
    }

    public static func bool(probability: Double = 0.5) -> Gen<Bool> {
        Gen<Bool> { rng in Double.random(in: 0..<1, using: &rng) < probability }
    }

    public static func element<C: Collection>(of collection: C) -> Gen<C.Element> {
        precondition(!collection.isEmpty, "Gen.element needs a non-empty collection")
        return Gen<C.Element> { rng in collection.randomElement(using: &rng)! }
    }

    public static func oneOf(_ generators: [Gen<Value>]) -> Gen<Value> {
        precondition(!generators.isEmpty)
        return Gen { rng in
            let index = Int.random(in: 0..<generators.count, using: &rng)
            return generators[index].run(&rng)
        }
    }

    public static func array<T>(of element: Gen<T>, count: ClosedRange<Int>) -> Gen<[T]> {
        Gen<[T]> { rng in
            let n = Int.random(in: count, using: &rng)
            return (0..<n).map { _ in element.run(&rng) }
        }
    }

    public func optional(probability: Double = 0.5) -> Gen<Value?> {
        Gen<Value?> { rng in
            Double.random(in: 0..<1, using: &rng) < probability ? self.run(&rng) : nil
        }
    }
}
