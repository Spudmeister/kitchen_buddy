import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// A recipe's photos: add (library/camera), set cover, caption, remove
/// (soft). Ingest runs off the main thread.
///
/// Requirements: kitchen-buddy-ios 11.1–11.4
@MainActor @Observable
public final class PhotoGalleryViewModel {
    public let environment: AppEnvironment
    public let recipeID: Recipe.ID
    public private(set) var photos: [Photo] = []
    public private(set) var isImporting = false
    public var error: String?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public func load() {
        photos = (try? environment.book.photos.photos(for: recipeID)) ?? []
    }

    public func url(for photo: Photo) -> URL { environment.book.photos.url(for: photo) }
    public func thumbnailURL(for photo: Photo) -> URL { environment.book.photos.thumbnailURL(for: photo) }

    public func add(_ data: Data) async {
        isImporting = true
        defer { isImporting = false }
        let book = environment.book
        let id = recipeID
        do {
            _ = try await Task.detached(priority: .userInitiated) { try book.photos.add(data, to: id) }.value
            load()
        } catch {
            self.error = "Couldn't add that photo: \(error)"
        }
    }

    public func setCover(_ photo: Photo) { perform { try $0.photos.setCover(photo.id) } }
    public func setCaption(_ photo: Photo, _ caption: String) { perform { try $0.photos.setCaption(photo.id, caption) } }
    public func remove(_ photo: Photo) {
        let url = environment.book.photos.url(for: photo)
        perform { try $0.photos.remove(photo.id) }
        Task { await ImageLoader.shared.evict(url) }
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            load()
        } catch {
            self.error = "\(error)"
        }
    }
}
