import Testing
import SwiftUI
import KitchenCore
import KitchenTesting
@testable import KitchenUI

@Suite struct RootViewTests {
    @Test @MainActor func rootAndScreensBuild() throws {
        let environment = AppEnvironment.preview()
        let recipe = try environment.book.recipes.create(RecipeDraft(title: "Toast", ingredients: [IngredientDraft(name: "bread")], instructions: [InstructionDraft(text: "Toast.")]))
        let folder = try environment.book.folders.create(name: "F", parentID: nil)
        _ = RootView(environment: environment).body
        _ = RootView(environment: environment, initialRoutes: [.settings, .backups]).body
        _ = LibraryView(environment: environment).body
        _ = FolderView(environment: environment, folderID: folder.id).body
        _ = RecipeDetailView(environment: environment, recipeID: recipe.id).body
        _ = RecipeEditorView(environment: environment, model: RecipeEditorViewModel(environment: environment)).body
        _ = TagPickerView(environment: environment, selection: .constant(["a"])).body
        _ = FolderPickerView(environment: environment, selection: .constant(nil)).body
        _ = ArchivedView(environment: environment).body
        _ = SettingsView(environment: environment).body
        _ = BackupsView(environment: environment).body
        _ = RecoveryView(environment: environment).body
        #expect(!environment.isRecoveryPresented)

        environment.router.showRecipe(recipe.id)
        #expect(environment.router.path == [.recipe(recipe.id)])
        let encoded = try #require(environment.router.encodedPath)
        environment.router.path = []
        environment.router.encodedPath = encoded
        #expect(environment.router.path == [.recipe(recipe.id)])
    }
}
