import Foundation
import Testing
import KitchenCore
import KitchenTesting
@testable import KitchenPersistence

/// Feature: kitchen-buddy-ios, URL import over a stubbed fetch: success,
/// blocked, no data, network failure, and the share inbox.
/// Validates: Requirements 12.1, 12.3–12.5
@Suite struct RecipeURLImporterTests {
    static let html = """
    <html><head><script type="application/ld+json">{"@type":"Recipe","name":"Stub Soup","recipeYield":"2",
    "recipeIngredient":["1 onion","2 cups stock"],"recipeInstructions":[{"@type":"HowToStep","text":"Simmer."}]}</script></head></html>
    """

    static func importer(status: Int = 200, body: String = html, mime: String? = "text/html", fail: Bool = false) -> RecipeURLImporter {
        RecipeURLImporter { url in
            if fail { throw URLError(.notConnectedToInternet) }
            return RecipeURLImporter.Page(data: Data(body.utf8), status: status, mimeType: mime, textEncodingName: "utf-8")
        }
    }

    @Test func importsADraftWithTheSource() async throws {
        let result = try await Self.importer().importRecipe(from: "example.com/soup")
        #expect(result.draft.content.title == "Stub Soup")
        #expect(result.draft.content.sourceURL?.absoluteString == "https://example.com/soup")
        #expect(result.draft.content.ingredients.count == 2 && result.draft.isValid)
        #expect(result.source == "json-ld")
    }

    @Test func failuresAreExplained() async {
        await #expect(throws: RecipeURLImporter.ImportError.invalidURL) { try await Self.importer().importRecipe(from: "not a url") }
        await #expect(throws: RecipeURLImporter.ImportError.blocked(status: 403)) { try await Self.importer(status: 403).importRecipe(from: "https://example.com") }
        await #expect(throws: RecipeURLImporter.ImportError.httpStatus(500)) { try await Self.importer(status: 500).importRecipe(from: "https://example.com") }
        await #expect(throws: RecipeURLImporter.ImportError.noRecipeData) { try await Self.importer(body: "<html><body>hi</body></html>").importRecipe(from: "https://example.com") }
        await #expect(throws: RecipeURLImporter.ImportError.notHTML) { try await Self.importer(mime: "application/pdf").importRecipe(from: "https://example.com/x.pdf") }
        do {
            _ = try await Self.importer(fail: true).importRecipe(from: "https://example.com")
            Issue.record("expected a network error")
        } catch let error as RecipeURLImporter.ImportError {
            if case .network = error {} else { Issue.record("wrong error \(error)") }
            #expect(!error.explanation.isEmpty)
        } catch {
            Issue.record("wrong error type \(error)")
        }
    }

    @Test func shareInboxQueuesAndDrains() {
        let suite = "kb-test-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let inbox = ShareInbox(defaults: defaults)
        #expect(inbox.pending().isEmpty && inbox.takeNext() == nil)
        inbox.enqueue(URL(string: "https://a.example/1")!)
        inbox.enqueue(URL(string: "https://a.example/1")!)
        inbox.enqueue(URL(string: "https://b.example/2")!)
        #expect(inbox.pending().count == 2, "duplicates collapse")
        #expect(inbox.takeNext()?.host == "a.example")
        #expect(inbox.takeNext()?.host == "b.example")
        #expect(inbox.takeNext() == nil)
    }
}
