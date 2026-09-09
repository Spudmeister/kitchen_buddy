import Foundation

/// Extracts a recipe from a web page's schema.org data: JSON-LD first
/// (including `@graph`, arrays, nested `mainEntity`, `HowToSection`),
/// then a microdata fallback. No network, no AI.
///
/// Requirements: kitchen-buddy-ios 12.1, 12.2
public enum SchemaOrgExtractor {
    public enum ExtractionError: Error, Hashable, Sendable {
        case noRecipeData
    }

    public struct Extracted: Hashable, Sendable {
        public var draft: RecipeDraft
        public var imageURLs: [URL]
        public var source: String  // "json-ld" or "microdata"
    }

    public static func extract(html: String, sourceURL: URL?) throws -> Extracted {
        if let recipe = jsonLDRecipe(in: html) {
            return Extracted(draft: draft(from: recipe, sourceURL: sourceURL), imageURLs: imageURLs(from: recipe["image"]), source: "json-ld")
        }
        if let recipe = Microdata.recipe(in: html) {
            return Extracted(draft: draft(from: recipe, sourceURL: sourceURL), imageURLs: imageURLs(from: recipe["image"]), source: "microdata")
        }
        throw ExtractionError.noRecipeData
    }

    // MARK: JSON-LD

    static func jsonLDRecipe(in html: String) -> [String: Any]? {
        let pattern = #/<script[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>(.*?)</script>/#.dotMatchesNewlines().ignoresCase()
        for match in html.matches(of: pattern) {
            let body = String(match.1)
            let cleaned = HTMLText.decodeEntities(body.replacingOccurrences(of: "<!--", with: "").replacingOccurrences(of: "-->", with: ""))
            guard let data = cleaned.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) else { continue }
            if let recipe = findRecipe(in: object, depth: 0) { return recipe }
        }
        return nil
    }

    static func findRecipe(in object: Any, depth: Int) -> [String: Any]? {
        guard depth < 6 else { return nil }
        if let array = object as? [Any] {
            for item in array { if let found = findRecipe(in: item, depth: depth + 1) { return found } }
            return nil
        }
        guard let dictionary = object as? [String: Any] else { return nil }
        if isRecipe(dictionary) { return dictionary }
        for key in ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "hasPart"] {
            if let nested = dictionary[key], let found = findRecipe(in: nested, depth: depth + 1) { return found }
        }
        return nil
    }

    static func isRecipe(_ dictionary: [String: Any]) -> Bool {
        let type = dictionary["@type"]
        if let text = type as? String { return text.caseInsensitiveCompare("Recipe") == .orderedSame }
        if let list = type as? [String] { return list.contains { $0.caseInsensitiveCompare("Recipe") == .orderedSame } }
        return false
    }

    // MARK: Draft

    static func draft(from recipe: [String: Any], sourceURL: URL?) -> RecipeDraft {
        let title = text(recipe["name"]) ?? text(recipe["headline"]) ?? "Imported Recipe"
        let ingredients = strings(recipe["recipeIngredient"] ?? recipe["ingredients"])
            .flatMap { $0.components(separatedBy: .newlines) }
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .map(IngredientNormalizer.parse)
        let steps = instructions(recipe["recipeInstructions"]).map { InstructionDraft(text: $0) }
        var tags: [String] = []
        for key in ["recipeCategory", "recipeCuisine", "keywords"] { tags += strings(recipe[key]).flatMap { $0.components(separatedBy: ",") } }
        let prep = text(recipe["prepTime"]).flatMap(ISO8601Duration.minutes)
        let cook = text(recipe["cookTime"]).flatMap(ISO8601Duration.minutes)
        let total = text(recipe["totalTime"]).flatMap(ISO8601Duration.minutes)
        let inferredCook = (cook == nil && total != nil && prep != nil) ? max(0, total! - prep!) : cook
        return RecipeDraft(
            title: HTMLText.line(title),
            description: text(recipe["description"]).map(HTMLText.plain),
            ingredients: ingredients,
            instructions: steps,
            prepMinutes: prep ?? (cook == nil && total != nil ? 0 : nil),
            cookMinutes: inferredCook ?? (prep == nil && total != nil ? total : nil),
            servings: servings(recipe["recipeYield"]),
            sourceURL: sourceURL,
            tags: TagName.normalize(tags.map { $0.lowercased() }).prefix(8).map { $0 })
    }

    static func text(_ value: Any?) -> String? {
        switch value {
        case let string as String: return string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : string
        case let array as [Any]: return array.compactMap(text).first
        case let dictionary as [String: Any]: return text(dictionary["@value"]) ?? text(dictionary["name"]) ?? text(dictionary["text"])
        case let number as NSNumber: return number.stringValue
        default: return nil
        }
    }

    static func strings(_ value: Any?) -> [String] {
        switch value {
        case let string as String: return [string]
        case let number as NSNumber: return [number.stringValue]
        case let array as [Any]: return array.flatMap(strings)
        case let dictionary as [String: Any]: return text(dictionary).map { [$0] } ?? []
        default: return []
        }
    }

    /// Steps from a string, a list of strings, HowToStep objects, or
    /// HowToSection groups (flattened in order).
    static func instructions(_ value: Any?) -> [String] {
        switch value {
        case let string as String:
            return HTMLText.plain(string).components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        case let array as [Any]:
            return array.flatMap(instructions)
        case let dictionary as [String: Any]:
            if let items = dictionary["itemListElement"] { return instructions(items) }
            if let step = text(dictionary["text"]) ?? text(dictionary["name"]) { return [HTMLText.line(step)] }
            return []
        default:
            return []
        }
    }

    /// "4 servings", "Serves 6", 8, ["4", "4 servings"] → the first integer.
    static func servings(_ value: Any?) -> Int? {
        for candidate in strings(value) {
            if let match = candidate.firstMatch(of: #/\d+/#), let number = Int(match.0), number > 0, number < 1000 { return number }
        }
        return nil
    }

    static func imageURLs(from value: Any?) -> [URL] {
        var urls: [URL] = []
        func visit(_ item: Any?) {
            switch item {
            case let string as String: if let url = URL(string: string), url.scheme?.hasPrefix("http") == true { urls.append(url) }
            case let array as [Any]: array.forEach(visit)
            case let dictionary as [String: Any]: visit(dictionary["url"] ?? dictionary["contentUrl"])
            default: break
            }
        }
        visit(value)
        return urls
    }

    // MARK: Microdata

    enum Microdata {
        /// Finds `itemtype="…schema.org/Recipe"` and collects `itemprop`
        /// values within it (attribute `content`, or the element's text).
        static func recipe(in html: String) -> [String: Any]? {
            guard let scopeRange = html.range(of: #"itemtype\s*=\s*["'][^"']*schema\.org/Recipe["']"#, options: [.regularExpression, .caseInsensitive]) else { return nil }
            let scope = String(html[scopeRange.lowerBound...])
            var result: [String: Any] = ["@type": "Recipe"]
            let pattern = #/<([a-zA-Z0-9]+)([^>]*?)itemprop\s*=\s*["']([^"']+)["']([^>]*)>/#.ignoresCase()
            for match in scope.matches(of: pattern) {
                let prop = String(match.3)
                let attributes = String(match.2) + String(match.4)
                let value: String
                if let content = attributes.firstMatch(of: #/content\s*=\s*["']([^"']*)["']/#.ignoresCase()) {
                    value = String(content.1)
                } else if let datetime = attributes.firstMatch(of: #/datetime\s*=\s*["']([^"']*)["']/#.ignoresCase()) {
                    value = String(datetime.1)
                } else if let src = attributes.firstMatch(of: #/src\s*=\s*["']([^"']*)["']/#.ignoresCase()) {
                    value = String(src.1)
                } else {
                    let after = scope[match.range.upperBound...]
                    let end = after.range(of: "</\(match.1)>", options: .caseInsensitive)?.lowerBound ?? after.endIndex
                    value = HTMLText.line(String(after[..<end]))
                }
                guard !value.isEmpty else { continue }
                if let existing = result[prop] as? [String] {
                    result[prop] = existing + [value]
                } else if let existing = result[prop] as? String {
                    result[prop] = [existing, value]
                } else {
                    result[prop] = value
                }
            }
            return result["name"] != nil ? result : nil
        }
    }
}
