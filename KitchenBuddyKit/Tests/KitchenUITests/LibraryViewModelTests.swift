import Foundation
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, Library behaviour at the view-model level.
/// Validates: Requirements 3.2, 6.1–6.4, 6.6
@Suite struct LibraryViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let book = try TestDatabase.inMemory()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    static func draft(_ title: String, tags: [String] = [], folderID: Folder.ID? = nil) -> RecipeDraft {
        RecipeDraft(title: title, ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")],
                    tags: tags, folderID: folderID)
    }

    @Test @MainActor func queryFollowsTextTokensAndSort() throws {
        let environment = try Self.environment()
        let model = LibraryViewModel(environment: environment)
        model.searchText = "pie"
        model.tokens = [.tag("Dessert"), .includeArchived]
        model.sort = .rating
        model.direction = .descending
        let query = model.query
        #expect(query.text == "pie" && query.tags == ["Dessert"] && query.includeArchived)
        #expect(query.sort == .rating && query.direction == .descending)
        #expect(model.isSearching)
        model.clearFilters()
        #expect(!model.isSearching && model.query == RecipeQuery(sort: .rating, direction: .descending))
    }

    @Test @MainActor func observationDeliversResultsAndEmptyStates() async throws {
        let environment = try Self.environment()
        let model = LibraryViewModel(environment: environment)
        model.start()
        defer { model.stop() }
        try await waitUntil { model.hasLoaded }
        #expect(model.emptyState == .noRecipes)

        let toast = try environment.book.recipes.create(Self.draft("Toast", tags: ["Breakfast"]))
        try await waitUntil { model.results.map(\.id) == [toast.id] }
        #expect(model.emptyState == nil)

        model.searchText = "zzz"
        model.start()
        try await waitUntil { model.hasLoaded && model.results.isEmpty }
        #expect(model.emptyState == .noMatches)

        model.clearFilters()
        model.start()
        try await waitUntil { model.results.count == 1 }
        model.archive(toast.id)
        try await waitUntil { model.results.isEmpty }
        #expect(model.emptyState == .noRecipes, "an archived-only book reads as empty")
        model.unarchive(toast.id)
        try await waitUntil { model.results.count == 1 }
        #expect(model.suggestedTokens.contains(.tag("Breakfast")))
    }

    @Test @MainActor func sectionsGroupByTopLevelFolder() async throws {
        let environment = try Self.environment()
        try environment.updatePreferences { $0.groupLibraryByFolder = true }
        let baking = try environment.book.folders.create(name: "Baking", parentID: nil)
        let bread = try environment.book.folders.create(name: "Bread", parentID: baking.id)
        let soups = try environment.book.folders.create(name: "Soups", parentID: nil)
        let loaf = try environment.book.recipes.create(Self.draft("Loaf", folderID: bread.id))
        let soup = try environment.book.recipes.create(Self.draft("Soup", folderID: soups.id))
        let unfiled = try environment.book.recipes.create(Self.draft("Unfiled thing"))

        let model = LibraryViewModel(environment: environment)
        model.start()
        defer { model.stop() }
        try await waitUntil { model.results.count == 3 }
        let sections = model.sections
        #expect(sections.map(\.title) == ["Baking", "Soups", "Unfiled"])
        #expect(sections[0].recipes.map(\.id) == [loaf.id])
        #expect(sections[1].recipes.map(\.id) == [soup.id])
        #expect(sections[2].recipes.map(\.id) == [unfiled.id])

        model.searchText = "so"
        #expect(model.sections.count == 1 && model.sections[0].title == nil, "searching is flat and ranked")

        let scoped = LibraryViewModel(environment: environment, scopeFolderID: baking.id)
        #expect(scoped.query.folderID == baking.id)
    }
}

@MainActor
func waitUntil(timeout: TimeInterval = 30, _ condition: @MainActor () -> Bool) async throws {
    let deadline = Date().addingTimeInterval(timeout)
    while !condition() {
        guard Date() < deadline else { throw WaitTimeout() }
        try await Task.sleep(for: .milliseconds(20))
    }
}

struct WaitTimeout: Error {}
