import Testing
import KitchenCore

/// Feature: kitchen-buddy-ios, fixed-factor conversion and best units.
/// Validates: Requirements 9.1, 9.2
@Suite struct UnitConverterTests {
    @Test func picksBestUnitByMagnitude() {
        let litres = UnitConverter.convert(Fraction(1200), .ml, to: .metric)
        #expect(litres.unit == .l)
        #expect(litres.quantity == Fraction(6, 5))

        let cup = UnitConverter.convert(Fraction(48), .tsp, to: .us)
        #expect(cup.unit == .cup)
        #expect(cup.quantity == Fraction(1))

        let quarterCup = UnitConverter.convert(Fraction(4), .tbsp, to: .us)
        #expect(quarterCup.unit == .cup)
        #expect(quarterCup.quantity == Fraction(1, 4))

        let grams = UnitConverter.convert(Fraction(1), .lb, to: .metric)
        #expect(grams.unit == .g)
        #expect(abs(grams.quantity.doubleValue - 453.592) < 0.01)
    }

    @Test func descriptiveUnitsPassThrough() {
        for unit in [IngredientUnit.piece, .dozen, .pinch, .dash, .toTaste] {
            let result = UnitConverter.convert(Fraction(3), unit, to: .metric)
            #expect(result.unit == unit)
            #expect(result.quantity == Fraction(3))
        }
        #expect(UnitConverter.convert(Fraction(1), from: .cup, to: .g) == nil)
        #expect(UnitConverter.convert(Fraction(1), from: .cup, to: .piece) == nil)
    }

    /// Dry ingredients cross to weight in metric and back to cups in US;
    /// liquids stay on volume (Andrew, 2026-09-09).
    @Test func dryIngredientsConvertByWeight() {
        func metric(_ name: String, _ quantity: Fraction, _ unit: IngredientUnit) -> String? {
            let shown = QuantityPipeline.prepare(Ingredient(name: name, quantity: quantity, unit: unit), preference: .metric)
            return QuantityFormatter.string(quantity: shown.quantity, unit: shown.unit)
        }
        func us(_ name: String, _ quantity: Fraction, _ unit: IngredientUnit) -> String? {
            let shown = QuantityPipeline.prepare(Ingredient(name: name, quantity: quantity, unit: unit), preference: .us)
            return QuantityFormatter.string(quantity: shown.quantity, unit: shown.unit)
        }
        #expect(metric("all-purpose flour", Fraction(1), .cup) == "125 g")
        #expect(metric("granulated sugar", Fraction(2), .cup) == "400 g")
        #expect(metric("packed brown sugar", Fraction(1, 2), .cup) == "107 g")
        #expect(metric("unsalted butter", Fraction(1, 2), .cup) == "114 g")
        #expect(metric("honey", Fraction(1), .tbsp) == "21 g")
        #expect(metric("kosher salt", Fraction(1), .tsp) == "5 g")
        #expect(metric("bread flour", Fraction(8), .cup) == "1 kg")
        #expect(metric("whole milk", Fraction(1), .cup) == "237 ml", "liquids stay on volume")
        #expect(metric("olive oil", Fraction(2), .tbsp) == "30 ml")
        #expect(us("flour", Fraction(250), .g) == "2 cups")
        #expect(us("sugar", Fraction(100), .g) == "½ cup")
        #expect(us("butter", Fraction(227), .g) == "1 cup")
        #expect(us("water", Fraction(500), .ml) == "2⅛ cups", "liquids stay on volume")
        #expect(metric("flour", Fraction(2), .cup) == "250 g" && us("flour", Fraction(2), .cup) == "2 cups", "US stays US")
    }

    @Test func originalPreferenceLeavesEverything() {
        let ingredient = Ingredient(name: "milk", quantity: Fraction(2), unit: .cup)
        #expect(UnitConverter.convert([ingredient], preference: .original) == [ingredient])
        #expect(UnitConverter.convert([ingredient], preference: .metric)[0].unit == .ml)
    }
}
