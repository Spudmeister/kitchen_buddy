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
    private var availableTokens: [SearchToken] = []
    /// Tokens offered under the search field: the active ones are left out.
    public var suggestedTokens: [SearchToken] {
        availableTokens.filter { token in !tokens.contains(where: { $0.id == token.id }) }
    }
    public private(set) var totalRecipes = 0
    public private(set) var hasLoaded = false
    public var error: String?
    private var observation: Task<Void, Never>?

    public init(environment: AppEnvironment, scopeFolderID: Folder.ID? = nil) {
        self.environment = environment
        self.scopeFolderID = scopeFolderID
    }

    // MARK: Query

    /// The query with tokens and the `#tag` / `in:Folder` shorthand applied.
    /// Shorthand words leave the free text so the FTS pattern never sees them.
    public var query: RecipeQuery {
        var query = RecipeQuery(sort: sort, direction: direction)
        query.folderID = scopeFolderID
        var words: [String] = []
        for word in searchText.split(separator: " ", omittingEmptySubsequences: true).map(String.init) {
            if word.hasPrefix("#"), word.count > 1 {
                query.tags.append(String(word.dropFirst()))
            } else if word.lowercased().hasPrefix("in:"), word.count > 3 {
                let name = String(word.dropFirst(3))
                if let folder = folders.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) {
                    query.folderID = folder.id
                } else {
                    words.append(name)
                }
            } else {
                words.append(word)
            }
        }
        query.text = words.joined(separator: " ")
        for token in tokens {
            switch token {
            case .tag(let name): query.tags.append(name)
            case .folder(let id, _): query.folderID = id
            case .minimumRating(let value): query.minimumRating = max(query.minimumRating ?? 0, value)
            case .maximumMinutes(let minutes): query.maximumTotalMinutes = min(query.maximumTotalMinutes ?? .max, minutes)
            case .includeArchived: query.includeArchived = true
            }
        }
        return query
    }

    public var isSearching: Bool { !searchText.isEmpty || !tokens.isEmpty }
    public var groupsByFolder: Bool { environment.preferences.groupLibraryByFolder && query.text.isEmpty && scopeFolderID == nil }

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
    /// changes. The first results are fetched synchronously so the list
    /// paints at once; the observation then keeps them live.
    public func start() {
        refreshSideData()
        refreshResults()
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

    /// Synchronous fetch of the current query (also used by tests, which
    /// cannot rely on main-queue delivery while other suites hog it).
    public func refreshResults() {
        do {
            results = try environment.book.recipes.summaries(query)
            hasLoaded = true
        } catch {
            self.error = "\(error)"
            hasLoaded = true
        }
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
        suggested += [.minimumRating(4), .maximumMinutes(30), .maximumMinutes(60), .includeArchived]
        availableTokens = suggested
    }

    public func clearFilters() {
        searchText = ""
        tokens = []
    }

    // MARK: Filter chips

    public var activeFilterCount: Int { tokens.count }

    public func isActive(_ token: SearchToken) -> Bool { tokens.contains { $0.id == token.id } }

    /// Toggles a tag / archived token; rating and time tokens replace their kind.
    public func toggle(_ token: SearchToken) {
        if isActive(token) {
            tokens.removeAll { $0.id == token.id }
            return
        }
        switch token {
        case .minimumRating: tokens.removeAll { if case .minimumRating = $0 { return true } else { return false } }
        case .maximumMinutes: tokens.removeAll { if case .maximumMinutes = $0 { return true } else { return false } }
        case .folder: tokens.removeAll { if case .folder = $0 { return true } else { return false } }
        default: break
        }
        tokens.append(token)
    }

    public var maximumMinutes: Int? {
        for token in tokens { if case .maximumMinutes(let minutes) = token { return minutes } }
        return nil
    }

    public var minimumRating: Int? {
        for token in tokens { if case .minimumRating(let value) = token { return value } }
        return nil
    }

    public func setMaximumMinutes(_ minutes: Int?) {
        tokens.removeAll { if case .maximumMinutes = $0 { return true } else { return false } }
        if let minutes { tokens.append(.maximumMinutes(minutes)) }
    }

    public func setMinimumRating(_ value: Int?) {
        tokens.removeAll { if case .minimumRating = $0 { return true } else { return false } }
        if let value { tokens.append(.minimumRating(value)) }
    }

    /// Tags in use, most used first (the chip bar shows the first few).
    public var tagChips: [SearchToken] {
        availableTokens.filter { if case .tag = $0 { return true } else { return false } }
    }

    public var activeTags: [String] {
        tokens.compactMap { if case .tag(let name) = $0 { return name } else { return nil } }
    }

    // MARK: Row actions

    public func archive(_ id: Recipe.ID) {
        perform { try $0.recipes.archive(id) }
        environment.spotlightUpdate(id)
    }

    public func unarchive(_ id: Recipe.ID) {
        perform { try $0.recipes.unarchive(id) }
        environment.spotlightUpdate(id)
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
