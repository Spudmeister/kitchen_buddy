import Testing
import KitchenCore
import KitchenTesting

/// Property 13: Dietary detection is pure and gated — the same ingredients
/// always give the same suggestions, order-independent and case-insensitive,
/// and a suggestion is never already in the recipe's tags.
/// Validates: Requirements 5.3, 5.4
@Suite struct P13DietaryDetectionTests {
    @Test(arguments: 0..<250)
    func detectionIsDeterministicAndGated(seed: UInt64) {
        var rng = SeededRandomSource(seed: seed)
        let content = RecipeGen.content.run(&rng)
        let existing = RecipeGen.tags.run(&rng)
        let detected = TagDetector.detect(content.ingredients)

        #expect(TagDetector.detect(content.ingredients) == detected, "seed \(seed)")
        let shuffled = Gen<[IngredientDraft]>.shuffled(content.ingredients).run(&rng)
        #expect(TagDetector.detect(shuffled) == detected, "seed \(seed)")
        let shouted = content.ingredients.map { IngredientDraft(name: $0.name.uppercased()) }
        #expect(TagDetector.detect(shouted) == detected, "seed \(seed)")

        let suggestions = TagDetector.suggestions(for: content, existingTags: existing)
        let existingKeys = Set(existing.map(TagName.key))
        #expect(suggestions.allSatisfy { !existingKeys.contains(TagName.key($0.rawValue)) }, "seed \(seed)")
        #expect(suggestions.allSatisfy(detected.contains), "seed \(seed)")

        for tag in DietaryTag.allCases {
            let excluded = content.ingredients.contains { line in
                TagDetector.exclusions(for: tag).contains { line.name.lowercased().contains($0) }
            }
            #expect(detected.contains(tag) == !excluded, "seed \(seed): \(tag)")
        }
    }
}
