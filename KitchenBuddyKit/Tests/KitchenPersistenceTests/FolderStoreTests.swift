import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, folders by example. Validates: Requirements 16.1–16.6
@Suite struct FolderStoreTests {
    let book = try! TestDatabase.inMemory()

    @Test func treeOperations() throws {
        let root = try book.folders.create(name: "Baking", parentID: nil)
        let child = try book.folders.create(name: "Bread", parentID: root.id)
        let grandchild = try book.folders.create(name: "Sourdough", parentID: child.id)
        #expect(try book.folders.subtree(of: root.id) == [root.id, child.id, grandchild.id])
        #expect(try book.folders.children(of: nil).map(\.id) == [root.id])

        #expect(throws: StoreError.folderCycle) { try book.folders.move(root.id, toParent: grandchild.id) }
        #expect(throws: StoreError.folderCycle) { try book.folders.move(root.id, toParent: root.id) }
        #expect(throws: StoreError.emptyFolderName) { try book.folders.create(name: " ", parentID: nil) }

        let moved = try book.folders.move(grandchild.id, toParent: root.id)
        #expect(moved.parentID == root.id)
        #expect(try book.folders.rename(child.id, to: "Loaves").name == "Loaves")
    }

    @Test func deleteMovesContentsToParent() throws {
        let root = try book.folders.create(name: "Dinner", parentID: nil)
        let child = try book.folders.create(name: "Pasta", parentID: root.id)
        let leaf = try book.folders.create(name: "Fresh", parentID: child.id)
        let recipe = try book.recipes.create(RecipeDraft(title: "Ragu", ingredients: [IngredientDraft(name: "beef")],
                                                         instructions: [InstructionDraft(text: "Simmer.")], folderID: child.id))
        #expect(try book.folders.recipeCounts() == [root.id: 1, child.id: 1, leaf.id: 0])

        try book.folders.delete(child.id)
        #expect(try book.recipes.detail(recipe.id)?.recipe.folderID == root.id)
        #expect(try book.folders.folder(leaf.id)?.parentID == root.id)
        #expect(try book.folders.all().map(\.id) == [root.id, leaf.id])
        #expect(try book.folders.folder(child.id)?.deletedAt != nil)
        #expect(throws: StoreError.folderNotFound(child.id)) { try book.recipes.move(recipe.id, toFolder: child.id) }
        #expect(try book.recipes.summaries(RecipeQuery(folderID: root.id)).map(\.id) == [recipe.id])
    }
}
