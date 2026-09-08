import Foundation

/// Prints quantities the way a cookbook does: "1½", "¾", "2", "0.06"; and
/// pairs them with unit labels ("1½ cups", "pinch", "to taste").
/// `QuantityParser.parse` reads every string this produces back to the same
/// fraction.
///
/// Requirements: kitchen-buddy-ios 8.2
public enum QuantityFormatter {
    static let glyphs: [Fraction: String] = [
        Fraction(1, 4): "¼", Fraction(1, 2): "½", Fraction(3, 4): "¾",
        Fraction(1, 3): "⅓", Fraction(2, 3): "⅔",
        Fraction(1, 8): "⅛", Fraction(3, 8): "⅜", Fraction(5, 8): "⅝", Fraction(7, 8): "⅞",
        Fraction(1, 5): "⅕", Fraction(2, 5): "⅖", Fraction(3, 5): "⅗", Fraction(4, 5): "⅘",
        Fraction(1, 6): "⅙", Fraction(5, 6): "⅚",
    ]

    public static func string(for quantity: Fraction) -> String {
        if quantity.isNegative { return "-" + string(for: quantity.magnitude) }
        let whole = quantity.whole
        let fractional = quantity.fractionalPart
        if fractional.isZero { return "\(whole)" }
        if let glyph = glyphs[fractional] {
            return whole == 0 ? glyph : "\(whole)\(glyph)"
        }
        if fractional.denominator <= 16 {
            let tail = "\(fractional.numerator)/\(fractional.denominator)"
            return whole == 0 ? tail : "\(whole) \(tail)"
        }
        return decimal(quantity)
    }

    /// Quantity and unit together, or nil when there is nothing to show.
    /// "to taste" never shows its quantity.
    public static func string(quantity: Fraction?, unit: IngredientUnit?) -> String? {
        if unit == .toTaste { return unit?.label(for: nil) }
        switch (quantity, unit) {
        case (nil, nil): return nil
        case (nil, let unit?): return unit.label(for: nil)
        case (let quantity?, nil): return string(for: quantity)
        case (let quantity?, let unit?): return "\(string(for: quantity)) \(unit.label(for: quantity))"
        }
    }

    private static func decimal(_ quantity: Fraction) -> String {
        var text = String(format: "%.2f", quantity.doubleValue)
        while text.hasSuffix("0") { text.removeLast() }
        if text.hasSuffix(".") { text.removeLast() }
        return text
    }
}
