import Foundation

/// A condition the app scores recipes for: one per-serving nutrient with
/// published thresholds (ADR-009).
///
/// Requirements: kitchen-buddy-ios 21.5
public enum HealthProfile: String, Codable, Hashable, Sendable, CaseIterable {
    case diabetes
    case bloodPressure
    case heartHealth

    /// Bumped when a threshold changes so `recipe_health` is rebuilt.
    public static let thresholdsVersion = 1

    public var title: String {
        switch self {
        case .diabetes: return "Diabetes"
        case .bloodPressure: return "Blood pressure"
        case .heartHealth: return "Heart health"
        }
    }

    /// "Diabetes-friendly" and the like, for chips and tokens.
    public var friendlyLabel: String { "\(title)-friendly" }

    public var measureName: String {
        switch self {
        case .diabetes: return "Glycemic load"
        case .bloodPressure: return "Sodium"
        case .heartHealth: return "Saturated fat"
        }
    }

    public var unitLabel: String {
        switch self {
        case .diabetes: return ""
        case .bloodPressure: return "mg"
        case .heartHealth: return "g"
        }
    }

    public var symbolName: String {
        switch self {
        case .diabetes: return "drop.fill"
        case .bloodPressure: return "heart.fill"
        case .heartHealth: return "waveform.path.ecg"
        }
    }

    /// Upper bounds of the low and medium bands, per serving.
    public var thresholds: (low: Double, medium: Double) {
        switch self {
        case .diabetes: return (10, 19)
        case .bloodPressure: return (140, 600)
        case .heartHealth: return (4, 8)
        }
    }

    /// Where the thresholds come from, for the Sources screen.
    public var thresholdSource: String {
        switch self {
        case .diabetes:
            return "Glycemic load bands from the International Tables (Atkinson, Foster-Powell & Brand-Miller): ≤ 10 low, 11–19 medium, ≥ 20 high per serving."
        case .bloodPressure:
            return "≤ 140 mg per serving is the US FDA \"low sodium\" claim; ≤ 600 mg is about a quarter of the 2,300 mg daily limit; above is high."
        case .heartHealth:
            return "≤ 4 g and ≤ 8 g saturated fat per serving are a third and two thirds of the American Heart Association's 13 g/day guidance."
        }
    }

    public var explanation: String {
        switch self {
        case .diabetes:
            return "Glycemic load estimates how much a serving raises blood glucose: each ingredient's available carbohydrate (total minus fibre) times its glycemic index."
        case .bloodPressure:
            return "Sodium per serving, from every ingredient's salt content."
        case .heartHealth:
            return "Saturated fat per serving."
        }
    }

    public func band(for value: Double?) -> HealthBand {
        guard let value else { return .unknown }
        if value <= thresholds.low { return .low }
        if value <= thresholds.medium { return .medium }
        return .high
    }

    /// How the value reads on a badge: "GL 8", "320 mg", "6 g".
    public func format(_ value: Double) -> String {
        switch self {
        case .diabetes: return "GL \(Int(value.rounded()))"
        case .bloodPressure: return "\(Int(value.rounded())) mg"
        case .heartHealth: return value < 10 ? String(format: "%.1f g", value) : "\(Int(value.rounded())) g"
        }
    }
}

/// One profile's result for a recipe.
public struct HealthScore: Hashable, Codable, Sendable {
    public var profile: HealthProfile
    /// Per serving; nil when unknown.
    public var value: Double?
    public var band: HealthBand

    public init(profile: HealthProfile, value: Double?, band: HealthBand) {
        self.profile = profile
        self.value = value
        self.band = band
    }

    public init(profile: HealthProfile, value: Double?, sufficient: Bool) {
        self.init(profile: profile, value: value, band: sufficient ? profile.band(for: value) : .unknown)
    }
}
