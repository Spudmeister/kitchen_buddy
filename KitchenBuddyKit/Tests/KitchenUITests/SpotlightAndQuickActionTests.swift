import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, Spotlight continuation and quick actions at
/// the environment level. Validates: Requirements 19.3, 19.4
@Suite struct SpotlightAndQuickActionTests {
    @Test @MainActor func quickActionsRouteAndSpotlightActivityResolves() async throws {
        let environment = AppEnvironment.preview()
        environment.perform(.newRecipe, clipboardURL: nil)
        #expect(environment.router.presented == .newRecipe(folderID: nil))
        let link = URL(string: "https://example.com/pie")!
        environment.perform(.importClipboard, clipboardURL: link)
        #expect(environment.router.presented == .importURL(link))

        let recipe = try environment.book.recipes.create(RecipeDraft(title: "Pie", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        let activity = NSUserActivity(activityType: "com.apple.corespotlightitem")
        activity.userInfo = ["kCSSearchableItemActivityIdentifier": recipe.id.rawValue]
        environment.continueActivity(activity)
        #expect(environment.router.path.last == .recipe(recipe.id))

        // Indexing is best-effort: unavailable environments report 0, never throw.
        let count = try await environment.spotlight.reindexAll(force: true)
        #expect(count == 0 || count == 1)
    }
}

