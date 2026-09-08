import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, tags by example. Validates: Requirements 5.1, 5.5
@Suite struct TagStoreTests {
    let book = try! TestDatabase.inMemory()

    @Test func namesAreCaseInsensitiveAndTrimmed() throws {
        let a = try book.recipes.create(RecipeDraft(title: "A", ingredients: [IngredientDraft(name: "x")],
                                                    instructions: [InstructionDraft(text: "y")], tags: ["Quick"]))
        let b = try book.recipes.create(RecipeDraft(title: "B", ingredients: [IngredientDraft(name: "x")],
                                                    instructions: [InstructionDraft(text: "y")]))
        try book.tags.add("  quick ", to: b.id)
        try book.tags.add("Dinner", to: b.id)
        #expect(try book.tags.tags(for: b.id) == ["Dinner", "Quick"])
        #expect(try book.tags.all() == [TagCount(name: "Quick", count: 2), TagCount(name: "Dinner", count: 1)])
        #expect(try book.tags.suggestions(prefix: "qu") == [TagCount(name: "Quick", count: 2)])
        #expect(try book.tags.suggestions(prefix: "%").isEmpty)

        try book.tags.remove("QUICK", from: a.id)
        #expect(try book.tags.tags(for: a.id).isEmpty)
        try book.recipes.archive(b.id)
        #expect(try book.tags.all() == [TagCount(name: "Dinner", count: 0), TagCount(name: "Quick", count: 0)])
        #expect(throws: StoreError.emptyTagName) { try book.tags.add(" ", to: a.id) }
    }
}
