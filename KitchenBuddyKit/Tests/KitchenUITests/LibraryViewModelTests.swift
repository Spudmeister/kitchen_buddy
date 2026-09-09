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

    @Test @MainActor func shorthandAndTokensBecomeFilters() async throws {
        let environment = try Self.environment()
        let desserts = try environment.book.folders.create(name: "Desserts", parentID: nil)
        let pie = try environment.book.recipes.create(Self.draft("Apple Pie", tags: ["Dessert", "Baking"], folderID: desserts.id))
        let soup = try environment.book.recipes.create(Self.draft("Apple Soup", tags: ["Soup"]))
        try environment.book.recipes.rate(pie.id, value: 5)
        try environment.book.recipes.rate(soup.id, value: 2)
        let model = LibraryViewModel(environment: environment)
        model.refreshSideData()

        model.searchText = "apple #dessert"
        #expect(model.query.text == "apple" && model.query.tags == ["dessert"])
        model.searchText = "in:desserts"
        #expect(model.query.folderID == desserts.id && model.query.text.isEmpty)
        model.searchText = "in:nowhere apple"
        #expect(model.query.folderID == nil && model.query.text == "nowhere apple", "unknown folder stays plain text")
        model.searchText = ""
        model.tokens = [.minimumRating(4), .maximumMinutes(30)]
        #expect(model.query.minimumRating == 4 && model.query.maximumTotalMinutes == 30)
        #expect(model.suggestedTokens.contains(.minimumRating(4)) == false, "active tokens are not re-suggested")
        #expect(model.suggestedTokens.contains(.maximumMinutes(60)))

        model.tokens = [.minimumRating(4)]
        model.refreshResults()
        #expect(model.results.map(\.id) == [pie.id])
        model.tokens = []
        model.searchText = "#soup"
        model.refreshResults()
        #expect(model.results.map(\.id) == [soup.id])
    }

    /// Front-page chips: time and rating chips replace their kind, tag chips
    /// accumulate, Clear drops everything (Andrew, 2026-09-09).
    @Test @MainActor func filterChipsToggleTokens() throws {
        let environment = try Self.environment()
        let quick = try environment.book.recipes.create(RecipeDraft(title: "Quick Dinner", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")], prepMinutes: 10, cookMinutes: 20, tags: ["Dinner"]))
        _ = try environment.book.recipes.create(RecipeDraft(title: "Slow Dinner", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")], prepMinutes: 30, cookMinutes: 90, tags: ["Dinner"]))
        _ = try environment.book.recipes.create(RecipeDraft(title: "Quick Breakfast", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")], prepMinutes: 5, cookMinutes: 10, tags: ["Breakfast"]))
        let model = LibraryViewModel(environment: environment)
        model.start()
        defer { model.stop() }
        #expect(model.tagChips.map(\.label) == ["Dinner", "Breakfast"], "most used first")

        model.toggle(.tag("Dinner"))
        model.toggle(.maximumMinutes(45))
        model.refreshResults()
        #expect(model.results.map(\.id) == [quick.id], "dinner under 45 minutes")
        #expect(model.activeFilterCount == 2 && model.maximumMinutes == 45)
        model.toggle(.maximumMinutes(60))
        #expect(model.maximumMinutes == 60 && model.activeFilterCount == 2, "time chips replace each other")
        model.toggle(.maximumMinutes(60))
        #expect(model.maximumMinutes == nil)
        model.setMinimumRating(4)
        model.setMinimumRating(4)
        #expect(model.minimumRating == 4 && model.activeFilterCount == 2)
        model.setMaximumMinutes(35)
        #expect(model.maximumMinutes == 35)
        model.tokens = []
        model.refreshResults()
        #expect(model.results.count == 3 && !model.isActive(.tag("Dinner")))
    }

    @Test @MainActor func startPaintsAtOnceAndEmptyStatesFollow() throws {
        let environment = try Self.environment()
        let model = LibraryViewModel(environment: environment)
        model.start()
        defer { model.stop() }
        #expect(model.hasLoaded && model.emptyState == .noRecipes, "first results are synchronous")

        let toast = try environment.book.recipes.create(Self.draft("Toast", tags: ["Breakfast"]))
        model.refreshResults()
        #expect(model.results.map(\.id) == [toast.id] && model.emptyState == nil)

        model.searchText = "zzz"
        model.start()
        #expect(model.results.isEmpty && model.emptyState == .noMatches)

        model.clearFilters()
        model.start()
        #expect(model.results.count == 1)
        model.archive(toast.id)
        model.refreshResults()
        #expect(model.results.isEmpty && model.emptyState == .noRecipes, "an archived-only book reads as empty")
        model.unarchive(toast.id)
        model.refreshResults()
        #expect(model.results.count == 1)
        #expect(model.suggestedTokens.contains(.tag("Breakfast")))
    }

    /// The one test that waits on the live observation: a write from
    /// outside the model reaches its results without a refresh call.
    @Test @MainActor func observationDeliversExternalWrites() async throws {
        let environment = try Self.environment()
        let model = LibraryViewModel(environment: environment)
        model.start()
        defer { model.stop() }
        let toast = try environment.book.recipes.create(Self.draft("Toast"))
        try await waitUntil(timeout: 120) { model.results.map(\.id) == [toast.id] }
    }

    @Test @MainActor func sectionsGroupByTopLevelFolder() throws {
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
        #expect(model.results.count == 3)
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
