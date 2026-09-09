import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Test images drawn with CoreGraphics and encoded through ImageIO, so
/// photo tests run headless on macOS without fixtures.
public enum ImageGen {
    public enum Format { case jpeg, png }

    /// A solid image with a diagonal stripe (so downsampling has something
    /// to do), encoded as JPEG or PNG. Optional EXIF taken-at.
    public static func image(width: Int, height: Int, format: Format = .jpeg, takenAt: Date? = nil, seed: UInt64 = 1) -> Data {
        let space = CGColorSpaceCreateDeviceRGB()
        let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        let hue = CGFloat(seed % 360) / 360
        context.setFillColor(CGColor(red: hue, green: 0.5, blue: 1 - hue, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: max(1, width / 10), height: height))
        let image = context.makeImage()!

        let data = NSMutableData()
        let type = format == .jpeg ? UTType.jpeg : UTType.png
        let destination = CGImageDestinationCreateWithData(data, type.identifier as CFString, 1, nil)!
        var properties: [CFString: Any] = [:]
        if let takenAt {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone.current
            formatter.dateFormat = "yyyy:MM:dd HH:mm:ss"
            properties[kCGImagePropertyExifDictionary] = [kCGImagePropertyExifDateTimeOriginal: formatter.string(from: takenAt)]
        }
        CGImageDestinationAddImage(destination, image, properties as CFDictionary)
        CGImageDestinationFinalize(destination)
        return data as Data
    }
}
