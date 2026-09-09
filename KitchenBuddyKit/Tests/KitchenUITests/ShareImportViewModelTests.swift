import Foundation
import PDFKit
import Testing
import KitchenCore
import KitchenPersistence
import KitchenTesting
@testable import KitchenUI

/// Feature: kitchen-buddy-ios, share/import screens at the view-model level
/// and the PDF golden test (page count, text extraction).
/// Validates: Requirements 13.1, 13.2, 13.5, 14.2–14.5
@Suite struct ShareImportViewModelTests {
    @MainActor
    static func environment() throws -> AppEnvironment {
        let (book, _) = try TestDatabase.onDisk()
        return AppEnvironment(book: book, cloud: CloudMirror(layout: book.layout, containerURL: { nil }))
    }

    @Test @MainActor func pdfHasPagesAndText() throws {
        let environment = try Self.environment()
        try environment.book.importLegacyV1(try LegacyFixtures.recipesV1Data())
        let large = try #require(try environment.book.recipes.summaries(RecipeQuery(text: "feast")).first ?? environment.book.recipes.summaries(.all).max { $0.title.count < $1.title.count })
        let detail = try #require(try environment.book.recipes.detail(large.id))
        let scaled = QuantityPipeline.prepare(detail.version.ingredients, factor: Fraction(2), preference: .metric)
        let data = try PDFRenderer.render(PDFRenderer.Input(detail: detail, ingredients: scaled, servings: detail.version.servings.map { $0 * 2 }, coverImageURL: nil))
        let pdf = try #require(PDFDocument(data: data))
        #expect(pdf.pageCount >= 1)
        let text = (0..<pdf.pageCount).compactMap { pdf.page(at: $0)?.string }.joined(separator: "\n")
        #expect(text.contains(detail.title))
        #expect(text.contains("Ingredients") && text.contains("Steps"))
        #expect(text.contains(detail.version.instructions[0].text.prefix(20)))
        if let ml = scaled.first(where: { $0.unit == .ml }), let amount = QuantityFormatter.string(quantity: ml.quantity, unit: ml.unit) {
            #expect(text.contains(amount), "scaled, converted amounts appear as shown on screen")
        }
        #expect(text.contains("1/\(pdf.pageCount)"))

        // A long recipe paginates.
        var draft = detail.draft
        draft.content.instructions = (1...60).map { InstructionDraft(text: "Step \($0): stir, wait, taste, adjust, and stir again while the pot murmurs.") }
        draft.content.ingredients = (1...40).map { IngredientDraft(name: "ingredient \($0)", quantity: Fraction($0), unit: .g) }
        let long = try environment.book.recipes.create(draft)
        let longDetail = try #require(try environment.book.recipes.detail(long.id))
        let longData = try PDFRenderer.render(PDFRenderer.Input(detail: longDetail, ingredients: longDetail.version.ingredients, servings: nil, coverImageURL: nil))
        let longPDF = try #require(PDFDocument(data: longData))
        #expect(longPDF.pageCount >= 3, "60 steps and 40 ingredients need several pages: \(longPDF.pageCount)")
        #expect(longPDF.page(at: longPDF.pageCount - 1)?.string?.contains("Step 60") == true)
    }

    @Test @MainActor func shareAndImportViewModels() async throws {
        let environment = try Self.environment()
        let created = try environment.book.recipes.create(RecipeDraft(title: "Shared Toast", ingredients: [IngredientDraft(name: "bread")], instructions: [InstructionDraft(text: "Toast.")], tags: ["quick"]))
        let share = ShareViewModel(environment: environment, scope: .recipe(created.id))
        #expect(share.canMakePDF && !share.includeHistory && share.suggestedName == "Shared Toast")
        await share.prepare()
        let url = try #require(share.fileURL)
        #expect(url.pathExtension == "kbrecipes" && (share.estimatedBytes ?? 0) > 0)

        let backup = ShareViewModel(environment: environment, scope: .all, backup: true)
        #expect(backup.includeHistory && !backup.canMakePDF)
        await backup.prepare()
        #expect(backup.fileURL?.lastPathComponent.hasPrefix("Kitchen Buddy Backup") == true)

        share.pdfInput = PDFRenderer.Input(detail: created, ingredients: created.version.ingredients, servings: nil, coverImageURL: nil)
        share.kind = .pdf
        await share.prepare()
        #expect(share.fileURL?.pathExtension == "pdf")

        let target = try Self.environment()
        let importModel = ImportFileViewModel(environment: target)
        importModel.load(url)
        #expect(importModel.problems.isEmpty && importModel.preview?.recipeCount == 1 && importModel.preview?.existingCount == 0)
        #expect(importModel.canImport)
        await importModel.performImport()
        #expect(importModel.summary?.imported == 1)
        #expect(try target.book.recipes.detail(created.id)?.title == "Shared Toast")

        let again = ImportFileViewModel(environment: target)
        again.load(url)
        #expect(again.preview?.existingCount == 1)
        again.policy = .copyAsNew
        await again.performImport()
        #expect(again.summary?.imported == 1)
        #expect(try target.book.recipes.count(includeArchived: true) == 2)

        let bad = ImportFileViewModel(environment: target)
        bad.load(data: Data("garbage".utf8))
        #expect(!bad.problems.isEmpty && !bad.canImport)
    }
}
