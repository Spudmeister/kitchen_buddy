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

    @Test func originalPreferenceLeavesEverything() {
        let ingredient = Ingredient(name: "milk", quantity: Fraction(2), unit: .cup)
        #expect(UnitConverter.convert([ingredient], preference: .original) == [ingredient])
        #expect(UnitConverter.convert([ingredient], preference: .metric)[0].unit == .ml)
    }
}
