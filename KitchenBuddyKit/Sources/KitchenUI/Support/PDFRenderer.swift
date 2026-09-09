import CoreGraphics
import Foundation
import KitchenCore
import KitchenPersistence
import SwiftUI

/// Renders a recipe to a paginated Letter/A4 PDF: cover photo, title,
/// times, servings, ingredients (as currently scaled and converted), steps,
/// source. Pages are SwiftUI views drawn with `ImageRenderer` into one
/// CGContext PDF, so the package renders headless on macOS too.
///
/// Requirements: kitchen-buddy-ios 13.2
@MainActor
public enum PDFRenderer {
    public enum Paper: String, CaseIterable, Sendable {
        case letter, a4
        var size: CGSize {
            switch self {
            case .letter: return CGSize(width: 612, height: 792)
            case .a4: return CGSize(width: 595, height: 842)
            }
        }
    }

    public struct Input {
        public var detail: RecipeDetail
        public var ingredients: [Ingredient]
        public var servings: Int?
        public var coverImageURL: URL?
        public init(detail: RecipeDetail, ingredients: [Ingredient], servings: Int?, coverImageURL: URL?) {
            self.detail = detail
            self.ingredients = ingredients
            self.servings = servings
            self.coverImageURL = coverImageURL
        }
    }

    /// Rough line budget per page drives pagination; a page holds ~34 lines.
    static let linesPerPage = 34

    public static func render(_ input: Input, paper: Paper = .letter) throws -> Data {
        let pages = paginate(input)
        let data = NSMutableData()
        guard let consumer = CGDataConsumer(data: data),
              let context = CGContext(consumer: consumer, mediaBox: nil, nil) else {
            throw CocoaError(.fileWriteUnknown)
        }
        var mediaBox = CGRect(origin: .zero, size: paper.size)
        for (index, page) in pages.enumerated() {
            let view = PDFPageView(input: input, page: page, pageNumber: index + 1, pageCount: pages.count, cover: index == 0 ? loadCover(input.coverImageURL) : nil)
                .frame(width: paper.size.width, height: paper.size.height)
            let renderer = ImageRenderer(content: view)
            renderer.proposedSize = ProposedViewSize(paper.size)
            context.beginPage(mediaBox: &mediaBox)
            renderer.render { _, draw in
                draw(context)
            }
            context.endPage()
        }
        context.closePDF()
        return data as Data
    }

    struct Page {
        var ingredientRange: Range<Int>
        var stepRange: Range<Int>
    }

    /// Ingredients then steps, split by an estimated line count; the first
    /// page also carries the header (and the cover when present).
    static func paginate(_ input: Input) -> [Page] {
        var pages: [Page] = []
        var ingredientIndex = 0, stepIndex = 0
        let ingredients = input.ingredients.count, steps = input.detail.version.instructions.count
        var first = true
        while ingredientIndex < ingredients || stepIndex < steps || pages.isEmpty {
            var budget = linesPerPage - (first ? (input.coverImageURL == nil ? 8 : 20) : 2)
            let ingredientStart = ingredientIndex
            while ingredientIndex < ingredients && budget > 0 { ingredientIndex += 1; budget -= 1 }
            let stepStart = stepIndex
            if ingredientIndex == ingredients {
                while stepIndex < steps && budget > 0 {
                    budget -= max(1, input.detail.version.instructions[stepIndex].text.count / 70 + 1)
                    stepIndex += 1
                }
            }
            pages.append(Page(ingredientRange: ingredientStart..<ingredientIndex, stepRange: stepStart..<stepIndex))
            first = false
            if pages.count > 50 { break }
        }
        return pages
    }

    static func loadCover(_ url: URL?) -> CGImage? {
        guard let url, let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let options = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true,
                       kCGImageSourceThumbnailMaxPixelSize: 900] as CFDictionary
        return CGImageSourceCreateThumbnailAtIndex(source, 0, options)
    }
}

import ImageIO

struct PDFPageView: View {
    let input: PDFRenderer.Input
    let page: PDFRenderer.Page
    let pageNumber: Int
    let pageCount: Int
    let cover: CGImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if pageNumber == 1 {
                if let cover {
                    Image(decorative: cover, scale: 1).resizable().aspectRatio(contentMode: .fill)
                        .frame(height: 200).clipped().clipShape(RoundedRectangle(cornerRadius: 8))
                }
                Text(input.detail.title).font(.system(size: 26, weight: .bold))
                if let description = input.detail.version.description {
                    Text(description).font(.system(size: 12)).foregroundStyle(.secondary)
                }
                HStack(spacing: 14) {
                    if let prep = input.detail.version.prepMinutes { Text("Prep \(DurationText.minutes(prep))") }
                    if let cook = input.detail.version.cookMinutes { Text("Cook \(DurationText.minutes(cook))") }
                    if let servings = input.servings { Text("\(servings) servings") }
                }
                .font(.system(size: 11)).foregroundStyle(.secondary)
                Divider()
            }
            if !page.ingredientRange.isEmpty {
                if page.ingredientRange.lowerBound == 0 { Text("Ingredients").font(.system(size: 15, weight: .semibold)) }
                ForEach(page.ingredientRange, id: \.self) { index in
                    let ingredient = input.ingredients[index]
                    let amount = QuantityFormatter.string(quantity: ingredient.quantity, unit: ingredient.unit)
                    Text("• \(amount.map { "\($0) " } ?? "")\(ingredient.name)\(ingredient.notes.map { ", \($0)" } ?? "")")
                        .font(.system(size: 11.5))
                }
            }
            if !page.stepRange.isEmpty {
                if page.stepRange.lowerBound == 0 { Text("Steps").font(.system(size: 15, weight: .semibold)).padding(.top, 4) }
                ForEach(page.stepRange, id: \.self) { index in
                    let step = input.detail.version.instructions[index]
                    HStack(alignment: .top, spacing: 8) {
                        Text("\(step.step).").font(.system(size: 11.5, weight: .semibold)).frame(width: 22, alignment: .trailing)
                        Text(step.text).font(.system(size: 11.5))
                    }
                }
            }
            Spacer(minLength: 0)
            HStack {
                if let url = input.detail.version.sourceURL { Text(url.absoluteString).lineLimit(1) }
                Spacer()
                Text("Kitchen Buddy · \(pageNumber)/\(pageCount)")
            }
            .font(.system(size: 9)).foregroundStyle(.secondary)
        }
        .padding(40)
        .background(Color.white)
        .foregroundStyle(Color.black)
        .environment(\.colorScheme, .light)
    }
}
