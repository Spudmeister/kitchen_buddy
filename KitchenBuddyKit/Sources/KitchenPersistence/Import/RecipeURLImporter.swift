import Foundation
import KitchenCore

/// Fetches a web page and extracts a recipe draft from its schema.org data.
/// The fetch is injectable (tests and the UI-test stub swap it); the
/// default uses a shared `URLSession` with a browser-like user agent, a
/// 20 s timeout, and a 4 MB cap. Nothing is saved: the editor reviews the
/// draft and the user taps Save.
///
/// Requirements: kitchen-buddy-ios 12.1–12.4
public final class RecipeURLImporter: Sendable {
    public enum ImportError: Error, Hashable, Sendable {
        case invalidURL
        case network(String)
        /// 401/403/429 or a bot wall: the site refused the page.
        case blocked(status: Int)
        case httpStatus(Int)
        case notHTML
        case tooLarge
        case noRecipeData

        public var explanation: String {
            switch self {
            case .invalidURL: return "That doesn't look like a web address."
            case .network(let message): return "Couldn't reach the page: \(message)"
            case .blocked: return "The site blocked the request. Open the page in Safari and use Share → Kitchen Buddy, or enter the recipe by hand."
            case .httpStatus(let status): return "The page returned an error (\(status))."
            case .notHTML: return "That address isn't a web page."
            case .tooLarge: return "The page is too large to read."
            case .noRecipeData: return "No recipe data was found on that page. Some sites don't publish it; enter the recipe by hand with the link kept as its source."
            }
        }
    }

    public struct Page: Sendable {
        public let data: Data
        public let status: Int
        public let mimeType: String?
        public let textEncodingName: String?
        public init(data: Data, status: Int, mimeType: String?, textEncodingName: String?) {
            self.data = data
            self.status = status
            self.mimeType = mimeType
            self.textEncodingName = textEncodingName
        }
    }

    public typealias Fetcher = @Sendable (URL) async throws -> Page
    public static let maximumBytes = 4 * 1_048_576

    private let fetch: Fetcher

    public init(fetch: @escaping Fetcher = RecipeURLImporter.defaultFetch) {
        self.fetch = fetch
    }

    public struct Result: Sendable {
        public let draft: RecipeDraft
        public let imageURLs: [URL]
        public let source: String
    }

    public func importRecipe(from text: String) async throws -> Result {
        guard let url = Self.normalizedURL(text) else { throw ImportError.invalidURL }
        let page: Page
        do {
            page = try await fetch(url)
        } catch let error as ImportError {
            throw error
        } catch {
            throw ImportError.network((error as NSError).localizedDescription)
        }
        switch page.status {
        case 200..<300: break
        case 401, 403, 429: throw ImportError.blocked(status: page.status)
        default: throw ImportError.httpStatus(page.status)
        }
        if let mime = page.mimeType, !mime.contains("html"), !mime.contains("xml"), !mime.contains("text") {
            throw ImportError.notHTML
        }
        guard page.data.count <= Self.maximumBytes else { throw ImportError.tooLarge }
        let html = Self.decode(page.data, encodingName: page.textEncodingName)
        do {
            let extracted = try SchemaOrgExtractor.extract(html: html, sourceURL: url)
            return Result(draft: extracted.draft, imageURLs: extracted.imageURLs, source: extracted.source)
        } catch {
            throw ImportError.noRecipeData
        }
    }

    /// Accepts "example.com/recipe" as well as full URLs.
    public static func normalizedURL(_ text: String) -> URL? {
        var trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if !trimmed.lowercased().hasPrefix("http://") && !trimmed.lowercased().hasPrefix("https://") { trimmed = "https://" + trimmed }
        guard let components = URLComponents(string: trimmed), let host = components.host, host.contains(".") else { return nil }
        return components.url
    }

    static func decode(_ data: Data, encodingName: String?) -> String {
        if let name = encodingName {
            let cfEncoding = CFStringConvertIANACharSetNameToEncoding(name as CFString)
            if cfEncoding != kCFStringEncodingInvalidId {
                let encoding = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(cfEncoding))
                if let text = String(data: data, encoding: encoding) { return text }
            }
        }
        return String(data: data, encoding: .utf8) ?? String(decoding: data, as: UTF8.self)
    }

    public static let defaultFetch: Fetcher = { url in
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 KitchenBuddy/1.0", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        let http = response as? HTTPURLResponse
        return Page(data: data, status: http?.statusCode ?? 200, mimeType: response.mimeType, textEncodingName: response.textEncodingName)
    }
}
