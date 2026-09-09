import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, a pinned table of what the display pipeline
/// prints for common scale factors — the "looks like a cookbook" check in
/// code form. Change a row only on purpose. Validates: Requirements 8.2, 9.2
@Suite struct QuantityFormatterTableTests {
    struct Row {
        let quantity: Fraction
        let unit: IngredientUnit
        let factor: Fraction
        let preference: UnitPreference
        let expected: String
    }

    static let table: [Row] = [
        Row(quantity: Fraction(1), unit: .cup, factor: Fraction(1, 2), preference: .original, expected: "½ cup"),
        Row(quantity: Fraction(1), unit: .cup, factor: Fraction(3, 2), preference: .original, expected: "1½ cups"),
        Row(quantity: Fraction(1, 3), unit: .cup, factor: Fraction(2), preference: .original, expected: "⅔ cup"),
        Row(quantity: Fraction(1, 3), unit: .cup, factor: Fraction(3, 4), preference: .original, expected: "¼ cup"),
        Row(quantity: Fraction(3, 4), unit: .tsp, factor: Fraction(1, 3), preference: .original, expected: "¼ tsp"),
        Row(quantity: Fraction(1, 8), unit: .tsp, factor: Fraction(1, 2), preference: .original, expected: "0.06 tsp"),
        Row(quantity: Fraction(2), unit: .tbsp, factor: Fraction(7, 4), preference: .original, expected: "3½ tbsp"),
        Row(quantity: Fraction(3), unit: .piece, factor: Fraction(7, 4), preference: .original, expected: "5½ pieces"),
        Row(quantity: Fraction(1), unit: .pinch, factor: Fraction(3, 2), preference: .original, expected: "2 pinches"),
        Row(quantity: Fraction(1), unit: .toTaste, factor: Fraction(3), preference: .metric, expected: "to taste"),
        Row(quantity: Fraction(1), unit: .cup, factor: Fraction(1), preference: .metric, expected: "237 ml"),
        Row(quantity: Fraction(4), unit: .cup, factor: Fraction(3, 2), preference: .metric, expected: "1½ l"),
        Row(quantity: Fraction(250), unit: .g, factor: Fraction(2), preference: .us, expected: "1⅛ lb"),
        Row(quantity: Fraction(500), unit: .ml, factor: Fraction(1), preference: .us, expected: "2⅛ cups"),
        Row(quantity: Fraction(48), unit: .tsp, factor: Fraction(1), preference: .us, expected: "1 cup"),
        Row(quantity: Fraction(1), unit: .lb, factor: Fraction(1, 2), preference: .metric, expected: "227 g"),
        Row(quantity: Fraction(2), unit: .kg, factor: Fraction(1), preference: .original, expected: "2 kg"),
    ]

    @Test(arguments: table.indices)
    func pipelinePrintsTheExpectedText(index: Int) {
        let row = Self.table[index]
        let ingredient = Ingredient(name: "x", quantity: row.quantity, unit: row.unit)
        let shown = QuantityPipeline.prepare(ingredient, factor: row.factor, preference: row.preference)
        let text = QuantityFormatter.string(quantity: shown.quantity, unit: shown.unit)
        #expect(text == row.expected, "\(row.quantity) \(row.unit.rawValue) × \(row.factor) as \(row.preference.rawValue)")
    }
}
