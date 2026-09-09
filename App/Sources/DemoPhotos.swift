import CoreGraphics
import Foundation
import ImageIO
import KitchenCore
import KitchenPersistence
import UniformTypeIdentifiers

/// Test-only photo seed (`--seed photos`): draws a few coloured images and
/// attaches them to the first demo recipes so screenshots and UI tests can
/// exercise the photo screens without a photo library.
enum DemoPhotos {
    static func seed(into book: RecipeBook) {
        guard let recipes = try? book.recipes.summaries(RecipeQuery(sort: .name)) else { return }
        for (recipeIndex, recipe) in recipes.prefix(3).enumerated() {
            guard (try? book.photos.photos(for: recipe.id).isEmpty) == true else { continue }
            for photoIndex in 0..<(recipeIndex == 0 ? 3 : 1) {
                if let data = image(seed: recipeIndex * 10 + photoIndex) {
                    _ = try? book.photos.add(data, to: recipe.id, caption: photoIndex == 0 ? "Fresh from the oven" : nil)
                }
            }
        }
    }

    private static func image(seed: Int) -> Data? {
        let width = 1600, height = 1200
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        let hue = CGFloat((seed * 47) % 360) / 360
        context.setFillColor(CGColor(red: 0.9 - hue * 0.5, green: 0.5 + hue * 0.3, blue: 0.3 + hue * 0.4, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 0.6))
        context.fillEllipse(in: CGRect(x: 300 + seed * 20, y: 250, width: 900, height: 700))
        guard let image = context.makeImage() else { return nil }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, image, nil)
        CGImageDestinationFinalize(destination)
        return data as Data
    }
}
