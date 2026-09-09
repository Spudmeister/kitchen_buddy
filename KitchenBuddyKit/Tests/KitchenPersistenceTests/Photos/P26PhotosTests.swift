import Foundation
import ImageIO
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Property 26: Photos — N supported images → N retrievable in order with
/// dimensions and thumbnails; the first is the cover; removal is soft.
/// Validates: Requirements 11.1–11.4
@Suite struct P26PhotosTests {
    static func size(of url: URL) -> (Int, Int)? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int else { return nil }
        return (width, height)
    }

    @Test(arguments: 0..<25)
    func ingestOrderCoverAndSoftRemoval(seed: UInt64) throws {
        var rng = SeededRandomSource(seed: seed)
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let recipe = try book.recipes.create(RecipeGen.draft.run(&rng))
        let count = Int.random(in: 1...5, using: &rng)
        var expected: [(width: Int, height: Int, takenAt: Date?)] = []
        for i in 0..<count {
            let width = Int.random(in: 40...3000, using: &rng), height = Int.random(in: 40...3000, using: &rng)
            let taken = Gen<Date>.date().optional().run(&rng) ?? nil
            let data = ImageGen.image(width: width, height: height, format: i % 2 == 0 ? .jpeg : .png, takenAt: taken, seed: UInt64(i))
            let photo = try book.photos.add(data, to: recipe.id, caption: i == 0 ? "cover" : nil)
            let scale = min(1, Double(PhotoStore.maximumPixelSize) / Double(max(width, height)))
            expected.append((Int((Double(width) * scale).rounded()), Int((Double(height) * scale).rounded()), taken))
            #expect(max(photo.width, photo.height) <= PhotoStore.maximumPixelSize, "seed \(seed)")
        }

        let photos = try book.photos.photos(for: recipe.id)
        #expect(photos.count == count, "seed \(seed)")
        #expect(photos.map(\.sortOrder) == Array(0..<count), "seed \(seed)")
        #expect(photos[0].caption == "cover", "seed \(seed)")
        for (photo, spec) in zip(photos, expected) {
            #expect(abs(photo.width - spec.width) <= 1 && abs(photo.height - spec.height) <= 1, "seed \(seed): \(photo.width)x\(photo.height) vs \(spec)")
            if let taken = spec.takenAt {
                #expect(photo.takenAt.map { abs($0.timeIntervalSince(taken)) < 1 } == true, "seed \(seed): EXIF date")
            }
            let full = book.photos.url(for: photo)
            let thumb = book.photos.thumbnailURL(for: photo)
            #expect(Self.size(of: full).map { $0 == (photo.width, photo.height) } == true, "seed \(seed): file matches row")
            #expect(Self.size(of: thumb).map { max($0.0, $0.1) <= PhotoStore.thumbnailPixelSize } == true, "seed \(seed): thumbnail")
        }
        #expect(try book.recipes.detail(recipe.id)?.coverPhoto?.id == photos[0].id, "seed \(seed)")
        #expect(try book.recipes.summaries(.all).first { $0.id == recipe.id }?.thumbnailPhotoID == photos[0].id, "seed \(seed)")

        // Set a new cover: it moves to the front, the rest keep their order.
        let newCover = photos[Int.random(in: 0..<count, using: &rng)]
        try book.photos.setCover(newCover.id)
        let reordered = try book.photos.photos(for: recipe.id)
        #expect(reordered.first?.id == newCover.id, "seed \(seed)")
        #expect(reordered.dropFirst().map(\.id) == photos.filter { $0.id != newCover.id }.map(\.id), "seed \(seed)")

        // Soft removal: row stays, file goes to Trash, cover moves on.
        try book.photos.remove(newCover.id)
        let remaining = try book.photos.photos(for: recipe.id)
        #expect(remaining.count == count - 1, "seed \(seed)")
        let removed = try #require(try book.photos.photo(newCover.id))
        #expect(removed.removedAt != nil, "seed \(seed)")
        #expect(FileManager.default.fileExists(atPath: book.photos.url(for: removed).path), "seed \(seed): trashed file kept")
        #expect(!FileManager.default.fileExists(atPath: layout.photosURL.appendingPathComponent(removed.fileName).path), "seed \(seed)")
        #expect(try book.recipes.detail(recipe.id)?.coverPhoto?.id == remaining.first?.id, "seed \(seed)")
        #expect(try book.photos.purgeTrash().isEmpty, "seed \(seed): nothing purged inside 30 days")
        #expect(!(try book.photos.purgeTrash(now: Date().addingTimeInterval(31 * 86_400))).isEmpty, "seed \(seed)")
        #expect(try book.photos.photo(newCover.id) != nil, "seed \(seed): the row is never deleted")
        try book.close()
    }

    @Test func unreadableDataIsRejected() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let recipe = try book.recipes.create(RecipeDraft(title: "T", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        #expect(throws: PhotoStore.PhotoError.unreadableImage) { try book.photos.add(Data("nope".utf8), to: recipe.id) }
        #expect(try book.photos.photos(for: recipe.id).isEmpty)
        #expect(try FileManager.default.contentsOfDirectory(atPath: layout.photosURL.path).isEmpty)
    }

    /// Ingesting 50 large images keeps memory bounded: decoding goes through
    /// ImageIO thumbnails, never a full bitmap per image held at once.
    @Test func fiftyPhotosStayWithinMemoryBudget() throws {
        let (book, layout) = try TestDatabase.onDisk()
        defer { TestDatabase.remove(layout) }
        let recipe = try book.recipes.create(RecipeDraft(title: "T", ingredients: [IngredientDraft(name: "x")], instructions: [InstructionDraft(text: "y")]))
        let before = residentBytes()
        for i in 0..<50 {
            try book.photos.add(ImageGen.image(width: 3000, height: 2000, seed: UInt64(i)), to: recipe.id)
        }
        let after = residentBytes()
        #expect(try book.photos.photos(for: recipe.id).count == 50)
        let growth = Double(after - before) / 1_048_576
        print("photo ingest resident growth \(growth.formatted(.number.precision(.fractionLength(0)))) MB")
        #expect(growth < 400, "resident memory grew \(growth) MB over 50 ingests")
        try book.close()
    }
}

private func residentBytes() -> Int64 {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
    let result = withUnsafeMutablePointer(to: &info) {
        $0.withMemoryRebound(to: integer_t.self, capacity: 1) { task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count) }
    }
    return result == KERN_SUCCESS ? Int64(info.resident_size) : 0
}
