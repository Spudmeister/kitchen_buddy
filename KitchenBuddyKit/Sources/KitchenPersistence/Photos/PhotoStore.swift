import Foundation
import GRDB
import ImageIO
import KitchenCore
import UniformTypeIdentifiers

/// Photos attached to recipes. Ingest decodes with ImageIO (JPEG, PNG,
/// HEIC/HEIF, anything the platform reads), writes a JPEG no larger than
/// 2048 px on the long edge plus a 400 px thumbnail, and records width,
/// height, and the EXIF taken-at. Removal is soft: the row keeps
/// `removed_at` and the files move to `Photos/Trash/`, purged only after 30
/// days — the one code path that deletes photo bytes (ADR-003).
///
/// Requirements: kitchen-buddy-ios 11.1–11.4, 11.6
public final class PhotoStore: @unchecked Sendable {
    public static let maximumPixelSize = 2048
    public static let thumbnailPixelSize = 400
    public static let trashRetention: TimeInterval = 30 * 86_400

    public enum PhotoError: Error, Hashable, Sendable {
        case unreadableImage
        case photoNotFound(Photo.ID)
    }

    let layout: DatabaseStack.Layout
    let handle: DatabaseHandle
    let clock: Clock

    init(layout: DatabaseStack.Layout, handle: DatabaseHandle, clock: Clock) {
        self.layout = layout
        self.handle = handle
        self.clock = clock
    }

    public var trashURL: URL { layout.photosURL.appendingPathComponent("Trash", isDirectory: true) }

    public func url(for photo: Photo) -> URL {
        (photo.removedAt == nil ? layout.photosURL : trashURL).appendingPathComponent(photo.fileName)
    }

    public func thumbnailURL(for photo: Photo) -> URL {
        (photo.removedAt == nil ? layout.photosURL : trashURL).appendingPathComponent(Self.thumbnailName(photo.fileName))
    }

    /// Thumbnail location from the id alone (file names are `<id>.jpg`), so
    /// Library rows need no photo lookup.
    public func thumbnailURL(forPhotoID id: Photo.ID) -> URL {
        layout.photosURL.appendingPathComponent("\(id.rawValue)-thumb.jpg")
    }

    static func thumbnailName(_ fileName: String) -> String {
        let base = (fileName as NSString).deletingPathExtension
        return "\(base)-thumb.jpg"
    }

    // MARK: Reads

    /// Non-removed photos in sort order; the first is the cover.
    public func photos(for recipeID: Recipe.ID) throws -> [Photo] {
        try handle.writer.read { db in try RecipeSQL.photos(recipeID, db) }
    }

    public func photo(_ id: Photo.ID) throws -> Photo? {
        try handle.writer.read { db in
            try Row.fetchOne(db, sql: "SELECT * FROM photos WHERE id = ?", arguments: [id.rawValue]).map(RecipeSQL.photo(from:))
        }
    }

    // MARK: Ingest

    /// Decodes, downsamples, writes the JPEG and thumbnail, and appends the
    /// photo at the end of the recipe's order.
    @discardableResult
    public func add(_ imageData: Data, to recipeID: Recipe.ID, caption: String? = nil) throws -> Photo {
        try DatabaseStack.prepareDirectory(layout.photosURL)
        let decoded = try Self.decode(imageData)
        let id = Photo.ID()
        let fileName = "\(id.rawValue).jpg"
        let now = clock.now()
        try Self.writeJPEG(decoded.image, to: layout.photosURL.appendingPathComponent(fileName), quality: 0.85)
        try Self.writeJPEG(decoded.thumbnail, to: layout.photosURL.appendingPathComponent(Self.thumbnailName(fileName)), quality: 0.8)

        return try handle.writer.write { db in
            try RecipeSQL.requireRecipe(recipeID, db)
            let next = (try Int.fetchOne(db, sql: "SELECT MAX(sort_order) FROM photos WHERE recipe_id = ?", arguments: [recipeID.rawValue]) ?? -1) + 1
            let photo = Photo(id: id, recipeID: recipeID, fileName: fileName,
                              width: decoded.image.width, height: decoded.image.height,
                              takenAt: decoded.takenAt, caption: caption.flatMap { $0.isEmpty ? nil : $0 },
                              sortOrder: next, createdAt: now)
            try db.execute(sql: """
                INSERT INTO photos (id, recipe_id, file_name, width, height, taken_at, caption, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, arguments: [photo.id.rawValue, recipeID.rawValue, fileName, photo.width, photo.height,
                                 photo.takenAt.sql, photo.caption, next, now.sql])
            try RecipeSQL.touch(recipeID, now: now, db)
            try SearchIndex.refresh(recipeID, db)
            return photo
        }
    }

    // MARK: Edits

    public func setCaption(_ id: Photo.ID, _ caption: String?) throws {
        try updating(id) { photo, now, db in
            try db.execute(sql: "UPDATE photos SET caption = ? WHERE id = ?",
                           arguments: [caption.flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.flatMap { $0.isEmpty ? nil : $0 }, id.rawValue])
        }
    }

    /// Moves the photo to the front; the others keep their relative order.
    public func setCover(_ id: Photo.ID) throws {
        try updating(id) { photo, now, db in
            let ordered = try RecipeSQL.photos(photo.recipeID, db)
            let reordered = [photo] + ordered.filter { $0.id != id }
            for (index, item) in reordered.enumerated() {
                try db.execute(sql: "UPDATE photos SET sort_order = ? WHERE id = ?", arguments: [index, item.id.rawValue])
            }
        }
    }

    /// Soft removal: the row stays with `removed_at`; files go to Trash.
    public func remove(_ id: Photo.ID) throws {
        try updating(id) { photo, now, db in
            guard photo.removedAt == nil else { return }
            try DatabaseStack.prepareDirectory(trashURL)
            for name in [photo.fileName, Self.thumbnailName(photo.fileName)] {
                let source = layout.photosURL.appendingPathComponent(name)
                if FileManager.default.fileExists(atPath: source.path) {
                    try? FileManager.default.moveItem(at: source, to: trashURL.appendingPathComponent(name))
                }
            }
            try db.execute(sql: "UPDATE photos SET removed_at = ? WHERE id = ?", arguments: [now.sql, id.rawValue])
        }
    }

    /// Deletes trashed files whose photo was removed more than 30 days ago.
    /// Rows are never deleted. Returns the file names purged.
    @discardableResult
    public func purgeTrash(now: Date? = nil) throws -> [String] {
        let cutoff = (now ?? clock.now()).addingTimeInterval(-Self.trashRetention)
        let expired = try handle.writer.read { db in
            try Row.fetchAll(db, sql: "SELECT * FROM photos WHERE removed_at IS NOT NULL AND removed_at < ?",
                             arguments: [cutoff.sql]).map(RecipeSQL.photo(from:))
        }
        var purged: [String] = []
        for photo in expired {
            for name in [photo.fileName, Self.thumbnailName(photo.fileName)] {
                let url = trashURL.appendingPathComponent(name)
                if FileManager.default.fileExists(atPath: url.path) {
                    try FileManager.default.removeItem(at: url)
                    purged.append(name)
                }
            }
        }
        return purged
    }

    private func updating(_ id: Photo.ID, _ change: (Photo, Date, Database) throws -> Void) throws {
        try handle.writer.write { db in
            guard let photo = try Row.fetchOne(db, sql: "SELECT * FROM photos WHERE id = ?", arguments: [id.rawValue]).map(RecipeSQL.photo(from:)) else {
                throw PhotoError.photoNotFound(id)
            }
            let now = clock.now()
            try change(photo, now, db)
            try RecipeSQL.touch(photo.recipeID, now: now, db)
            try SearchIndex.refresh(photo.recipeID, db)
        }
    }

    // MARK: Imaging (ImageIO, so the package builds on macOS)

    struct Decoded {
        let image: CGImage
        let thumbnail: CGImage
        let takenAt: Date?
    }

    static func decode(_ data: Data) throws -> Decoded {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil), CGImageSourceGetCount(source) > 0 else {
            throw PhotoError.unreadableImage
        }
        let full = [kCGImageSourceCreateThumbnailFromImageAlways: true,
                    kCGImageSourceCreateThumbnailWithTransform: true,
                    kCGImageSourceThumbnailMaxPixelSize: maximumPixelSize] as CFDictionary
        let small = [kCGImageSourceCreateThumbnailFromImageAlways: true,
                     kCGImageSourceCreateThumbnailWithTransform: true,
                     kCGImageSourceThumbnailMaxPixelSize: thumbnailPixelSize] as CFDictionary
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, full),
              let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, small) else {
            throw PhotoError.unreadableImage
        }
        return Decoded(image: image, thumbnail: thumbnail, takenAt: takenAt(from: source))
    }

    static func takenAt(from source: CGImageSource) -> Date? {
        guard let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let exif = properties[kCGImagePropertyExifDictionary] as? [CFString: Any],
              let text = exif[kCGImagePropertyExifDateTimeOriginal] as? String else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy:MM:dd HH:mm:ss"
        return formatter.date(from: text).map(Timestamp.normalize)
    }

    static func writeJPEG(_ image: CGImage, to url: URL, quality: Double) throws {
        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw PhotoError.unreadableImage
        }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw PhotoError.unreadableImage }
    }
}
