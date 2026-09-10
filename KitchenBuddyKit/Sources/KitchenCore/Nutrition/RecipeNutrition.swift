import Foundation

/// The estimator's full result for one recipe: every line, the totals, the
/// per-serving figures and the coverage that decides whether bands show.
///
/// Requirements: kitchen-buddy-ios 21.2–21.5
public struct RecipeNutrition: Hashable, Sendable {
    /// Below this share of countable lines the bands are unknown.
    public static let minimumCoverage = 0.8

    public var lines: [LineEstimate]
    public var effectiveServings: Int?
    public var totals: Food.Nutrients
    public var totalGlycemicLoad: Double

    public init(lines: [LineEstimate], effectiveServings: Int?) {
        self.lines = lines
        self.effectiveServings = effectiveServings
        var totals = Food.Nutrients.zero
        var load = 0.0
        for line in lines where line.status == .counted {
            if let nutrients = line.nutrients { totals = totals + nutrients }
            load += line.glycemicLoad ?? 0
        }
        self.totals = totals
        self.totalGlycemicLoad = load
    }

    public var countedLines: Int { lines.filter { $0.status == .counted }.count }
    public var countableLines: Int { lines.filter { $0.status.isCountable }.count }
    public var coverage: Double { countableLines == 0 ? 0 : Double(countedLines) / Double(countableLines) }
    /// Enough of the recipe is understood to band it.
    public var isSufficient: Bool { countableLines > 0 && coverage >= Self.minimumCoverage }

    public var perServing: Food.Nutrients? {
        guard let servings = effectiveServings, servings > 0 else { return nil }
        return totals.scaled(by: 1 / Double(servings))
    }

    public var perServingGlycemicLoad: Double? {
        guard let servings = effectiveServings, servings > 0 else { return nil }
        return totalGlycemicLoad / Double(servings)
    }

    public func value(for profile: HealthProfile) -> Double? {
        switch profile {
        case .diabetes: return perServingGlycemicLoad
        case .bloodPressure: return perServing?.sodium
        case .heartHealth: return perServing?.saturatedFat
        }
    }

    public func score(for profile: HealthProfile) -> HealthScore {
        HealthScore(profile: profile, value: value(for: profile), sufficient: isSufficient)
    }

    public var scores: [HealthScore] { HealthProfile.allCases.map(score(for:)) }

    /// The compact form stored in `recipe_health` and shown on Library rows.
    public var health: RecipeHealth {
        RecipeHealth(effectiveServings: effectiveServings, coverage: coverage,
                     carbohydrate: perServing?.carbohydrate,
                     availableCarbohydrate: perServing?.availableCarbohydrate,
                     glycemicLoad: perServingGlycemicLoad,
                     sodium: perServing?.sodium, saturatedFat: perServing?.saturatedFat,
                     bands: Dictionary(uniqueKeysWithValues: scores.map { ($0.profile, $0.band) }))
    }

    /// Lines that were not counted, for the worksheet's second section.
    public var uncountedLines: [LineEstimate] { lines.filter { $0.status != .counted } }
}
