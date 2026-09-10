import Foundation

/// The per-serving figures and bands kept in `recipe_health` and carried on
/// `RecipeSummary` for badges and filters. Everything is per effective
/// serving; nil values are unknown.
///
/// Requirements: kitchen-buddy-ios 21.6, 21.8, 21.9
public struct RecipeHealth: Hashable, Codable, Sendable {
    public var effectiveServings: Int?
    /// Counted ÷ countable lines, 0…1.
    public var coverage: Double
    public var carbohydrate: Double?
    public var availableCarbohydrate: Double?
    public var glycemicLoad: Double?
    public var sodium: Double?
    public var saturatedFat: Double?
    public var bands: [HealthProfile: HealthBand]

    public init(effectiveServings: Int? = nil, coverage: Double = 0, carbohydrate: Double? = nil,
                availableCarbohydrate: Double? = nil, glycemicLoad: Double? = nil, sodium: Double? = nil,
                saturatedFat: Double? = nil, bands: [HealthProfile: HealthBand] = [:]) {
        self.effectiveServings = effectiveServings
        self.coverage = coverage
        self.carbohydrate = carbohydrate
        self.availableCarbohydrate = availableCarbohydrate
        self.glycemicLoad = glycemicLoad
        self.sodium = sodium
        self.saturatedFat = saturatedFat
        self.bands = bands
    }

    public func value(for profile: HealthProfile) -> Double? {
        switch profile {
        case .diabetes: return glycemicLoad
        case .bloodPressure: return sodium
        case .heartHealth: return saturatedFat
        }
    }

    public func band(for profile: HealthProfile) -> HealthBand { bands[profile] ?? .unknown }

    public func score(for profile: HealthProfile) -> HealthScore {
        HealthScore(profile: profile, value: value(for: profile), band: band(for: profile))
    }
}
