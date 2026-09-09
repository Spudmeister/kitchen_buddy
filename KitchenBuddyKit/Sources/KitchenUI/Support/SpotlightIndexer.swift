import Foundation
import KitchenCore
import KitchenPersistence
#if canImport(CoreSpotlight)
import CoreSpotlight
import UniformTypeIdentifiers
#endif

/// Spotlight: non-archived recipes are searchable from the Home screen by
/// title, description, tags and ingredient names; archived ones are
/// removed. Tapping a result resolves to `kitchenbuddy://recipe/<id>` via
/// user-activity continuation.
///
/// Requirements: kitchen-buddy-ios 19.3
public final class SpotlightIndexer: @unchecked Sendable {
    public static let domain = "net.puddleglum.kitchenbuddy.recipes"
    public static let activityType = "net.puddleglum.kitchenbuddy.recipe"

    private let book: RecipeBook
    private let lock = NSLock()
    private var lastFullIndex: Date?

    public init(book: RecipeBook) {
        self.book = book
    }

    public static var isAvailable: Bool {
        #if canImport(CoreSpotlight)
        return CSSearchableIndex.isIndexingAvailable()
        #else
        return false
        #endif
    }

    /// Indexes every non-archived recipe and drops the rest. Throttled to
    /// once per `minimumInterval` unless forced (Settings › Reindex).
    public func reindexAll(force: Bool = false, minimumInterval: TimeInterval = 3_600) async throws -> Int {
        let due = lock.withLock { force || lastFullIndex.map { Date().timeIntervalSince($0) >= minimumInterval } ?? true }
        guard due else { return 0 }
        #if canImport(CoreSpotlight)
        guard Self.isAvailable else { return 0 }
        let summaries = try book.recipes.summaries(RecipeQuery(includeArchived: false, sort: .dateUpdated, direction: .descending))
        let items = try summaries.map { try item(for: $0) }
        let index = CSSearchableIndex.default()
        try await index.deleteSearchableItems(withDomainIdentifiers: [Self.domain])
        for chunk in stride(from: 0, to: items.count, by: 500).map({ Array(items[$0..<min($0 + 500, items.count)]) }) {
            try await index.indexSearchableItems(chunk)
        }
        lock.withLock { lastFullIndex = Date() }
        return items.count
        #else
        return 0
        #endif
    }

    /// Index one recipe (after save/unarchive) or remove it (after archive).
    public func update(_ id: Recipe.ID) async {
        #if canImport(CoreSpotlight)
        guard Self.isAvailable else { return }
        do {
            let index = CSSearchableIndex.default()
            if let summary = try book.recipes.summaries(RecipeQuery(includeArchived: true)).first(where: { $0.id == id }), !summary.isArchived {
                try await index.indexSearchableItems([try item(for: summary)])
            } else {
                try await index.deleteSearchableItems(withIdentifiers: [id.rawValue])
            }
        } catch {
            // Spotlight is best-effort; the next full reindex repairs it.
        }
        #endif
    }

    /// The recipe id in a Spotlight continuation activity, if any.
    public static func recipeID(from activity: NSUserActivity) -> Recipe.ID? {
        #if canImport(CoreSpotlight)
        if activity.activityType == CSSearchableItemActionType,
           let identifier = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String {
            return Recipe.ID(identifier)
        }
        #endif
        return nil
    }

    #if canImport(CoreSpotlight)
    private func item(for summary: RecipeSummary) throws -> CSSearchableItem {
        let attributes = CSSearchableItemAttributeSet(contentType: .text)
        attributes.title = summary.title
        let detail = try book.recipes.detail(summary.id)
        let ingredients = detail?.version.ingredients.map(\.name) ?? []
        attributes.contentDescription = summary.description ?? ingredients.prefix(6).joined(separator: ", ")
        attributes.keywords = summary.tags + ingredients
        attributes.identifier = summary.id.rawValue
        attributes.contentURL = URL(string: "kitchenbuddy://recipe/\(summary.id.rawValue)")
        if let photoID = summary.thumbnailPhotoID {
            attributes.thumbnailURL = book.photos.thumbnailURL(forPhotoID: photoID)
        }
        let item = CSSearchableItem(uniqueIdentifier: summary.id.rawValue, domainIdentifier: Self.domain, attributeSet: attributes)
        item.expirationDate = .distantFuture
        return item
    }
    #endif
}
