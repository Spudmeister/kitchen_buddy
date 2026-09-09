import Foundation

/// Just enough HTML handling for recipe extraction: tag stripping,
/// entity decoding, whitespace collapsing. No parser dependency, so the
/// package stays Foundation-only.
public enum HTMLText {
    static let entities: [String: String] = [
        "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&apos;": "'",
        "&nbsp;": " ", "&#160;": " ", "&frac12;": "½", "&frac14;": "¼", "&frac34;": "¾",
        "&deg;": "°", "&ndash;": "–", "&mdash;": "—", "&hellip;": "…", "&eacute;": "é", "&egrave;": "è",
    ]

    /// Strips tags, decodes common and numeric entities, collapses whitespace.
    public static func plain(_ html: String) -> String {
        var text = html.replacingOccurrences(of: #"<br\s*/?>"#, with: "\n", options: .regularExpression)
        text = text.replacingOccurrences(of: #"</(p|li|div|h[1-6])>"#, with: "\n", options: .regularExpression)
        text = text.replacingOccurrences(of: #"<[^>]+>"#, with: "", options: .regularExpression)
        text = decodeEntities(text)
        let lines = text.components(separatedBy: .newlines)
            .map { $0.replacingOccurrences(of: #"[ \t\u{00A0}]+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return lines.joined(separator: "\n")
    }

    public static func decodeEntities(_ text: String) -> String {
        var result = text
        for (entity, value) in entities { result = result.replacingOccurrences(of: entity, with: value) }
        // Numeric entities: &#8212; and &#x2014;
        while let match = result.range(of: #"&#(x[0-9a-fA-F]+|[0-9]+);"#, options: .regularExpression) {
            let code = result[match].dropFirst(2).dropLast()
            let scalarValue = code.hasPrefix("x") ? UInt32(code.dropFirst(), radix: 16) : UInt32(code)
            let replacement = scalarValue.flatMap(Unicode.Scalar.init).map { String(Character($0)) } ?? ""
            result.replaceSubrange(match, with: replacement)
        }
        return result
    }

    /// One line of plain text (newlines collapsed).
    public static func line(_ html: String) -> String {
        plain(html).replacingOccurrences(of: "\n", with: " ").trimmingCharacters(in: .whitespaces)
    }
}
