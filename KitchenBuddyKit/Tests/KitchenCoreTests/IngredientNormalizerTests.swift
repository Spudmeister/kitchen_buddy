import Testing
import KitchenCore
import KitchenTesting

/// Feature: kitchen-buddy-ios, ingredient line normalisation and the P31
/// round trip `parse(format(line)) == line`. Validates: Requirements 1.3, 12.2
@Suite struct IngredientNormalizerTests {
    @Test(arguments: [
        ("2 1/2 cups all-purpose flour, sifted", IngredientDraft(name: "all-purpose flour", quantity: Fraction(5, 2), unit: .cup, notes: "sifted", category: .pantry)),
        ("1 tbsp. olive oil", IngredientDraft(name: "olive oil", quantity: Fraction(1), unit: .tbsp, category: .pantry)),
        ("3 large eggs", IngredientDraft(name: "large eggs", quantity: Fraction(3), unit: nil, category: .dairy)),
        ("½ tsp salt", IngredientDraft(name: "salt", quantity: Fraction(1, 2), unit: .tsp, category: .spices)),
        ("1-2 cloves garlic, minced", IngredientDraft(name: "cloves garlic", quantity: Fraction(1), unit: nil, notes: "minced", category: .produce)),
        ("200g dark chocolate (70%)", IngredientDraft(name: "dark chocolate", quantity: Fraction(200), unit: .g, notes: "70%", category: .pantry)),
        ("Salt and pepper to taste", IngredientDraft(name: "Salt and pepper to taste", quantity: nil, unit: nil, category: .spices)),
        ("1 (14 oz) can chickpeas, drained", IngredientDraft(name: "can chickpeas", quantity: Fraction(1), unit: nil, notes: "drained, 14 oz", category: .pantry)),
        ("2 cups of milk", IngredientDraft(name: "milk", quantity: Fraction(2), unit: .cup, category: .dairy)),
        ("1.5 lbs chicken thighs", IngredientDraft(name: "chicken thighs", quantity: Fraction(3, 2), unit: .lb, category: .meat)),
        ("1 fl oz lime juice", IngredientDraft(name: "lime juice", quantity: Fraction(1), unit: .fluidOunce, category: .beverages)),
    ])
    func parsesRealWorldLines(line: String, expected: IngredientDraft) {
        #expect(IngredientNormalizer.parse(line) == expected, Comment(rawValue: line))
    }

    @Test func splitsPastedText() {
        let lines = IngredientNormalizer.lines(fromPasted: "• 2 eggs\n- 1 cup milk\n\n3. 1 tsp vanilla\n   \n")
        #expect(lines == ["2 eggs", "1 cup milk", "1 tsp vanilla"])
    }

    /// P31 half two: formatting a normalized draft and parsing it back gives
    /// the same draft, for random practical quantities, units, and names.
    @Test(arguments: 0..<250)
    func formatThenParseRoundTrips(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        var draft = RecipeGen.ingredient.run(&rng).normalized()
        // Round trip is defined over what a line can carry: a practical
        // quantity, a unit only with a quantity, no commas/parens in the name.
        draft.quantity = draft.quantity.map { PracticalRounding.round($0, unit: draft.unit) }
        if draft.quantity == nil { draft.unit = nil }
        draft.name = draft.name.replacingOccurrences(of: ",", with: " ")
        draft.notes = draft.notes?.replacingOccurrences(of: ",", with: " ")
        if draft.quantity == nil, draft.name.first?.isNumber == true { draft.name = "x " + draft.name }
        draft.category = IngredientNormalizer.category(for: draft.name)
        let line = IngredientNormalizer.format(draft)
        let parsed = IngredientNormalizer.parse(line)
        #expect(parsed == draft, "seed \(seed): \(line) → \(parsed)")
    }
}
