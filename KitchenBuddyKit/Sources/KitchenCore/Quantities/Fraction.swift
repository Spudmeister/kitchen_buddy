import Foundation

/// An exact rational number: the quantity type for ingredients.
///
/// Recipes are written in fractions (1/3 cup, 1 1/2 tsp) and scaled by
/// rational factors (4 servings → 6 is 3/2), so quantities are stored and
/// scaled exactly and only rounded for display (ADR-003, PracticalRounding).
/// Always normalized: gcd(numerator, denominator) == 1, denominator > 0.
///
/// Requirements: kitchen-buddy-ios 1.3, 8.1
public struct Fraction: Hashable, Sendable {
    public let numerator: Int
    public let denominator: Int

    /// Creates a normalized fraction. Traps on a zero denominator (a
    /// programming error, never user input — parsers validate first).
    public init(_ numerator: Int, _ denominator: Int = 1) {
        precondition(denominator != 0, "Fraction denominator must not be zero")
        let sign = denominator < 0 ? -1 : 1
        let g = Fraction.gcd(abs(numerator), abs(denominator))
        let divisor = g == 0 ? 1 : g
        self.numerator = sign * numerator / divisor
        self.denominator = abs(denominator) / divisor
    }

    /// Nearest fraction with a denominator no larger than `maxDenominator`
    /// (continued-fraction expansion). Used to lift doubles from JSON and
    /// from unit conversion back into exact arithmetic; `0.333` → 1/3.
    /// Returns nil for non-finite input.
    public init?(approximating value: Double, maxDenominator: Int = 64) {
        guard value.isFinite, maxDenominator >= 1 else { return nil }
        let negative = value < 0
        var x = abs(value)
        var (h0, h1, k0, k1) = (0, 1, 1, 0)
        var best = (num: Int(x.rounded()), den: 1)
        for _ in 0..<64 {
            let a = Int(x.rounded(.down))
            let h2 = a * h1 + h0
            let k2 = a * k1 + k0
            if k2 > maxDenominator { break }
            best = (h2, k2)
            (h0, h1, k0, k1) = (h1, h2, k1, k2)
            let frac = x - Double(a)
            if frac < 1e-12 { break }
            x = 1 / frac
        }
        self.init(negative ? -best.num : best.num, best.den)
    }

    public static let zero = Fraction(0)
    public static let one = Fraction(1)

    public var doubleValue: Double { Double(numerator) / Double(denominator) }
    public var isZero: Bool { numerator == 0 }
    public var isNegative: Bool { numerator < 0 }
    public var isWhole: Bool { denominator == 1 }

    /// Integer part toward zero, e.g. 7/4 → 1.
    public var whole: Int { numerator / denominator }

    /// Fractional remainder with the same sign, e.g. 7/4 → 3/4.
    public var fractionalPart: Fraction { Fraction(numerator - whole * denominator, denominator) }

    public static func + (lhs: Fraction, rhs: Fraction) -> Fraction {
        Fraction(lhs.numerator * rhs.denominator + rhs.numerator * lhs.denominator,
                 lhs.denominator * rhs.denominator)
    }

    public static func - (lhs: Fraction, rhs: Fraction) -> Fraction {
        Fraction(lhs.numerator * rhs.denominator - rhs.numerator * lhs.denominator,
                 lhs.denominator * rhs.denominator)
    }

    /// Exact product. On Int overflow (absurd inputs only) falls back to a
    /// rational approximation of the Double product rather than trapping.
    public static func * (lhs: Fraction, rhs: Fraction) -> Fraction {
        let (n, nOverflow) = lhs.numerator.multipliedReportingOverflow(by: rhs.numerator)
        let (d, dOverflow) = lhs.denominator.multipliedReportingOverflow(by: rhs.denominator)
        if nOverflow || dOverflow {
            return Fraction(approximating: lhs.doubleValue * rhs.doubleValue, maxDenominator: 1000) ?? .zero
        }
        return Fraction(n, d)
    }

    public static func / (lhs: Fraction, rhs: Fraction) -> Fraction {
        precondition(!rhs.isZero, "Division by zero fraction")
        return lhs * Fraction(rhs.denominator, rhs.numerator)
    }

    public static prefix func - (value: Fraction) -> Fraction {
        Fraction(-value.numerator, value.denominator)
    }

    private static func gcd(_ a: Int, _ b: Int) -> Int {
        var (a, b) = (a, b)
        while b != 0 { (a, b) = (b, a % b) }
        return a
    }
}

extension Fraction: Comparable {
    public static func < (lhs: Fraction, rhs: Fraction) -> Bool {
        // Denominators are positive, so cross-multiplication preserves order.
        lhs.numerator * rhs.denominator < rhs.numerator * lhs.denominator
    }
}

extension Fraction: ExpressibleByIntegerLiteral {
    public init(integerLiteral value: Int) { self.init(value) }
}

extension Fraction: CustomStringConvertible {
    /// Canonical text form used in JSON (`"1/3"`, `"2"`, `"-3/4"`).
    public var description: String {
        isWhole ? "\(numerator)" : "\(numerator)/\(denominator)"
    }

    /// Parses the canonical text form and plain integers. Mixed numbers and
    /// unicode fractions are the job of the quantity parser in KitchenCore.
    public init?(parsing text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        let parts = trimmed.split(separator: "/", omittingEmptySubsequences: false)
        switch parts.count {
        case 1:
            guard let n = Int(parts[0]) else { return nil }
            self.init(n)
        case 2:
            guard let n = Int(parts[0]), let d = Int(parts[1]), d != 0 else { return nil }
            self.init(n, d)
        default:
            return nil
        }
    }
}

extension Fraction: Codable {
    /// Encoded as the canonical string so JSON never rounds it.
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let text = try container.decode(String.self)
        guard let value = Fraction(parsing: text) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not a fraction: \(text)")
        }
        self = value
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(description)
    }
}

extension Fraction {
    /// Absolute value.
    public var magnitude: Fraction { isNegative ? -self : self }

    /// Nearest fraction with a denominator no larger than `maxDenominator`
    /// (never nil for finite input; zero for non-finite).
    public static func rationalizing(_ value: Double, maxDenominator: Int) -> Fraction {
        Fraction(approximating: value, maxDenominator: maxDenominator) ?? .zero
    }
}
