import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Library state: the live query (text + tokens + sort), results observed
/// from the store, folder sectioning, suggested tokens, and the row actions.
///
/// Requirements: kitchen-buddy-ios 3.2, 6.1–6.4, 6.6
@MainActor @Observable
public final class LibraryViewModel {
    public enum EmptyState: Equatable { case noRecipes, noMatches }

    public struct Section: Identifiable, Hashable {
        public let id: String
        public let title: String?
        public let folderID: Folder.ID?
        public var recipes: [RecipeSummary]
    }

    public let environment: AppEnvironment
    /// Fixed folder scope (the folder screen); nil for the whole book.
    public let scopeFolderID: Folder.ID?
    public var searchText = ""
    public var tokens: [SearchToken] = []
    public var sort: RecipeQuery.Sort = .name
    public var direction: RecipeQuery.Direction = .ascending
    public private(set) var results: [RecipeSummary] = []
    public private(set) var folders: [Folder] = []
    public private(set) var suggestedTokens: [SearchToken] = []
    public private(set) var totalRecipes = 0
    public private(set) var hasLoaded = false
    public var error: String?
    private var observation: Task<Void, Never>?

    public init(environment: AppEnvironment, scopeFolderID: Folder.ID? = nil) {
        self.environment = environment
        self.scopeFolderID = scopeFolderID
    }

    // MARK: Query

    public var query: RecipeQuery {
        var query = RecipeQuery(text: searchText, sort: sort, direction: direction)
        query.folderID = scopeFolderID
        for token in tokens {
            switch token {
            case .tag(let name): query.tags.append(name)
            case .folder(let id, _): query.folderID = id
            case .includeArchived: query.includeArchived = true
            }
        }
        return query
    }

    public var isSearching: Bool { !searchText.isEmpty || !tokens.isEmpty }
    public var groupsByFolder: Bool { environment.preferences.groupLibraryByFolder && searchText.isEmpty && scopeFolderID == nil }

    public var emptyState: EmptyState? {
        guard hasLoaded, results.isEmpty else { return nil }
        return totalRecipes == 0 && !isSearching ? .noRecipes : .noMatches
    }

    /// Results grouped by top-level folder when the preference is on and no
    /// text is being searched; otherwise one flat, ranked section.
    public var sections: [Section] {
        guard groupsByFolder else {
            return [Section(id: "all", title: nil, folderID: nil, recipes: results)]
        }
        var byTop: [Folder.ID?: [RecipeSummary]] = [:]
        for recipe in results {
            let top = recipe.folderID.flatMap { FolderTree.topLevel(of: $0, in: folders) }?.id
            byTop[top, default: []].append(recipe)
        }
        let topFolders = folders.filter { $0.parentID == nil }
            .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
        var sections = topFolders.compactMap { folder -> Section? in
            guard let recipes = byTop[folder.id], !recipes.isEmpty else { return nil }
            return Section(id: folder.id.rawValue, title: folder.name, folderID: folder.id, recipes: recipes)
        }
        if let unfiled = byTop[nil], !unfiled.isEmpty {
            sections.append(Section(id: "unfiled", title: "Unfiled", folderID: nil, recipes: unfiled))
        }
        return sections
    }

    // MARK: Lifecycle

    /// (Re)starts the observation for the current query and refreshes the
    /// folder and token side data. Call on appear and whenever the query
    /// changes.
    public func start() {
        refreshSideData()
        observation?.cancel()
        let stream = environment.book.recipes.observeSummaries(query)
        observation = Task { [weak self] in
            do {
                for try await summaries in stream {
                    guard let self, !Task.isCancelled else { return }
                    self.results = summaries
                    self.hasLoaded = true
                }
            } catch {
                guard let self else { return }
                self.error = "\(error)"
                self.hasLoaded = true
            }
        }
    }

    public func stop() {
        observation?.cancel()
        observation = nil
    }

    public func refreshSideData() {
        let book = environment.book
        folders = (try? book.folders.all()) ?? []
        totalRecipes = (try? book.recipes.count(includeArchived: false)) ?? 0
        let tags = ((try? book.tags.all()) ?? []).filter { $0.count > 0 }.prefix(8)
        var suggested = tags.map { SearchToken.tag($0.name) }
        if scopeFolderID == nil {
            suggested += folders.filter { $0.parentID == nil }.prefix(4).map { SearchToken.folder($0.id, name: $0.name) }
        }
        suggested.append(.includeArchived)
        suggestedTokens = suggested.filter { token in !tokens.contains(where: { $0.id == token.id }) }
    }

    public func clearFilters() {
        searchText = ""
        tokens = []
    }

    // MARK: Row actions

    public func archive(_ id: Recipe.ID) {
        perform { try $0.recipes.archive(id) }
    }

    public func unarchive(_ id: Recipe.ID) {
        perform { try $0.recipes.unarchive(id) }
    }

    @discardableResult
    public func duplicate(_ id: Recipe.ID) -> Recipe.ID? {
        do {
            return try environment.book.recipes.duplicate(id).id
        } catch {
            self.error = "\(error)"
            return nil
        }
    }

    public func createFolder(named name: String, parentID: Folder.ID?) {
        perform { _ = try $0.folders.create(name: name, parentID: parentID) }
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            refreshSideData()
        } catch {
            self.error = "\(error)"
        }
    }
}
