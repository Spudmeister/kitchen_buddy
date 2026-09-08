/// A unit of measure for an ingredient quantity. Raw values are the storage
/// and JSON form, shared with the v1 export format (`fl_oz`, `to_taste`).
///
/// Named `IngredientUnit` rather than `Unit` because Foundation already
/// exports a `Unit` class and every importer of both modules would hit an
/// ambiguity.
///
/// Requirements: kitchen-buddy-ios 1.1, 9.1
public enum IngredientUnit: String, CaseIterable, Codable, Hashable, Sendable {
    // US volume
    case tsp, tbsp, cup
    case fluidOunce = "fl_oz"
    case pint, quart, gallon
    // Metric volume
    case ml, l
    // US weight
    case oz, lb
    // Metric weight
    case g, kg
    // Count
    case piece, dozen
    // Descriptive — pass through conversion and scale to whole numbers
    case pinch, dash
    case toTaste = "to_taste"

    public enum Category: String, CaseIterable, Codable, Hashable, Sendable {
        case volume, weight, count, other
    }

    public var category: Category {
        switch self {
        case .tsp, .tbsp, .cup, .fluidOunce, .pint, .quart, .gallon, .ml, .l: return .volume
        case .oz, .lb, .g, .kg: return .weight
        case .piece, .dozen: return .count
        case .pinch, .dash, .toTaste: return .other
        }
    }

    /// The system this unit belongs to; nil for count and descriptive units,
    /// which never convert.
    public var system: UnitSystem? {
        switch self {
        case .tsp, .tbsp, .cup, .fluidOunce, .pint, .quart, .gallon, .oz, .lb: return .us
        case .ml, .l, .g, .kg: return .metric
        case .piece, .dozen, .pinch, .dash, .toTaste: return nil
        }
    }

    /// True for volume and weight units, which have a fixed factor to a base
    /// unit (ml or g).
    public var isConvertible: Bool { system != nil }

    /// Short label as printed after a quantity ("2 tbsp", "3 cups").
    public func label(for quantity: Fraction?) -> String {
        let plural = quantity.map { $0 > .one } ?? false
        switch self {
        case .tsp: return "tsp"
        case .tbsp: return "tbsp"
        case .cup: return plural ? "cups" : "cup"
        case .fluidOunce: return "fl oz"
        case .pint: return plural ? "pints" : "pint"
        case .quart: return plural ? "quarts" : "quart"
        case .gallon: return plural ? "gallons" : "gallon"
        case .ml: return "ml"
        case .l: return "l"
        case .oz: return "oz"
        case .lb: return "lb"
        case .g: return "g"
        case .kg: return "kg"
        case .piece: return plural ? "pieces" : "piece"
        case .dozen: return "dozen"
        case .pinch: return plural ? "pinches" : "pinch"
        case .dash: return plural ? "dashes" : "dash"
        case .toTaste: return "to taste"
        }
    }

    /// Full name for pickers.
    public var displayName: String {
        switch self {
        case .tsp: return "teaspoon"
        case .tbsp: return "tablespoon"
        case .cup: return "cup"
        case .fluidOunce: return "fluid ounce"
        case .pint: return "pint"
        case .quart: return "quart"
        case .gallon: return "gallon"
        case .ml: return "milliliter"
        case .l: return "liter"
        case .oz: return "ounce"
        case .lb: return "pound"
        case .g: return "gram"
        case .kg: return "kilogram"
        case .piece: return "piece"
        case .dozen: return "dozen"
        case .pinch: return "pinch"
        case .dash: return "dash"
        case .toTaste: return "to taste"
        }
    }
}
