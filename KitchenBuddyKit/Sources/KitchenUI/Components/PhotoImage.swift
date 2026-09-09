import CoreGraphics
import Foundation
import ImageIO
import SwiftUI

/// Loads an image file off the main thread through ImageIO, downsampled to
/// `maxPixelSize`, and caches the result. Cross-platform (no UIImage).
struct PhotoImage: View {
    let url: URL?
    var maxPixelSize: Int = 800
    var contentMode: ContentMode = .fill
    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image {
                Image(decorative: image, scale: 1)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else {
                Rectangle().fill(.quaternary)
                    .overlay { Image(systemName: "fork.knife").foregroundStyle(.secondary) }
            }
        }
        .task(id: url) {
            guard let url else { image = nil; return }
            image = await ImageLoader.shared.load(url, maxPixelSize: maxPixelSize)
        }
    }
}

/// Decodes with ImageIO thumbnails (bounded memory) and caches by URL + size.
actor ImageLoader {
    static let shared = ImageLoader()
    private let cache = NSCache<NSString, CGImageBox>()

    final class CGImageBox {
        let image: CGImage
        init(_ image: CGImage) { self.image = image }
    }

    init() { cache.countLimit = 200 }

    func load(_ url: URL, maxPixelSize: Int) -> CGImage? {
        let key = "\(url.path)#\(maxPixelSize)" as NSString
        if let cached = cache.object(forKey: key) { return cached.image }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let options = [kCGImageSourceCreateThumbnailFromImageAlways: true,
                       kCGImageSourceCreateThumbnailWithTransform: true,
                       kCGImageSourceShouldCacheImmediately: true,
                       kCGImageSourceThumbnailMaxPixelSize: maxPixelSize] as CFDictionary
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else { return nil }
        cache.setObject(CGImageBox(image), forKey: key)
        return image
    }

    func evict(_ url: URL) {
        for size in [200, 800, 2048] { cache.removeObject(forKey: "\(url.path)#\(size)" as NSString) }
    }
}
