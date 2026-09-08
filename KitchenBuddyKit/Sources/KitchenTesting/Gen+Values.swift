import Foundation
import KitchenCore

extension Gen where Value == Date {
    /// Whole-second dates in the given range of years (UTC).
    public static func date(years: ClosedRange<Int> = 2020...2030) -> Gen<Date> {
        Gen<Date> { rng in
            let start = Calendar(identifier: .gregorian).date(from: DateComponents(timeZone: TimeZone(secondsFromGMT: 0), year: years.lowerBound, month: 1, day: 1))!
            let end = Calendar(identifier: .gregorian).date(from: DateComponents(timeZone: TimeZone(secondsFromGMT: 0), year: years.upperBound + 1, month: 1, day: 1))!
            let seconds = Int.random(in: 0..<Int(end.timeIntervalSince(start)), using: &rng)
            return start.addingTimeInterval(TimeInterval(seconds))
        }
    }
}

extension Gen where Value == Fraction {
    /// Positive quantities as cooks write them: mixed numbers with practical
    /// fractions most of the time, arbitrary small-denominator fractions and
    /// tiny amounts the rest.
    public static var quantity: Gen<Fraction> {
        Gen<Fraction>.oneOf([
            Gen<Fraction> { rng in
                let whole = Int.random(in: 0...12, using: &rng)
                let part = PracticalRounding.practicalFractions.dropLast().randomElement(using: &rng)!
                return Bool.random(using: &rng) ? Fraction(whole) + part : Fraction(max(whole, 1))
            },
            Gen<Fraction> { rng in
                Fraction(Int.random(in: 1...64, using: &rng), Int.random(in: 1...16, using: &rng))
            },
            Gen<Fraction> { rng in Fraction(Int.random(in: 1...20, using: &rng), 100) },
            Gen<Fraction> { rng in Fraction(Int.random(in: 1...400, using: &rng)) },
        ])
    }
}

extension Gen {
    /// A subset of `collection` in its original order, each element kept
    /// with `probability`.
    public static func subset<C: Collection>(of collection: C, probability: Double = 0.5) -> Gen<[C.Element]> {
        Gen<[C.Element]> { rng in
            collection.filter { _ in Double.random(in: 0..<1, using: &rng) < probability }
        }
    }

    /// A random permutation.
    public static func shuffled<T>(_ elements: [T]) -> Gen<[T]> {
        Gen<[T]> { rng in elements.shuffled(using: &rng) }
    }
}
