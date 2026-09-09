import Foundation

/// Reads any supported export file — v2 (`.kbrecipes`) or the PWA's v1
/// JSON (lifted to v2 shape with one version per recipe) — and reports
/// validation problems as a list, never a crash.
///
/// Requirements: kitchen-buddy-ios 14.1, 14.5
public enum ImportDocument {
    public enum Problem: Error, Hashable, Sendable, CustomStringConvertible {
        case notJSON
        case unknownFormat(String)
        case unsupportedVersion(String)
        case malformed(String)
        case noRecipes

        public var description: String {
            switch self {
            case .notJSON: return "The file isn't JSON."
            case .unknownFormat(let format): return "Unknown file format “\(format)”."
            case .unsupportedVersion(let version): return "Format version \(version) is newer than this app understands."
            case .malformed(let detail): return "The file is malformed: \(detail)"
            case .noRecipes: return "The file holds no recipes."
            }
        }
    }

    public enum Source: Hashable, Sendable { case v2, v1 }

    public struct Reading: Sendable {
        public let document: ExportDocumentV2
        public let source: Source
    }

    /// Detects the format and decodes it; throws the first problem found.
    public static func read(_ data: Data, now: Date = Date()) throws -> Reading {
        guard let object = try? JSONSerialization.jsonObject(with: data) else { throw Problem.notJSON }
        if let dictionary = object as? [String: Any], dictionary["format"] as? String == ExportDocumentV2.formatName {
            let version = dictionary["version"] as? String ?? "?"
            guard version.hasPrefix("2.") else { throw Problem.unsupportedVersion(version) }
            do {
                let document = try ExportDocumentV2.decode(data)
                guard !document.recipes.isEmpty else { throw Problem.noRecipes }
                return Reading(document: document, source: .v2)
            } catch let problem as Problem {
                throw problem
            } catch {
                throw Problem.malformed(describe(error))
            }
        }
        if let dictionary = object as? [String: Any], let format = dictionary["format"] as? String {
            throw Problem.unknownFormat(format)
        }
        do {
            let drafts = try LegacyV1Reader.drafts(from: object)
            guard !drafts.isEmpty else { throw Problem.noRecipes }
            return Reading(document: lift(drafts, now: now), source: .v1)
        } catch LegacyV1Reader.ReaderError.unrecognizedShape {
            throw Problem.unknownFormat("unrecognized JSON")
        }
    }

    /// v1 drafts become v2 records with fresh ids and one version each.
    public static func lift(_ drafts: [RecipeDraft], now: Date) -> ExportDocumentV2 {
        let recipes = drafts.map { draft -> ExportDocumentV2.RecipeRecord in
            let id = Recipe.ID()
            let content = draft.normalized().content
            let version = RecipeVersion(recipeID: id, version: 1, title: content.title, description: content.description,
                                        ingredients: content.ingredients.map { Ingredient($0) },
                                        instructions: content.instructions.enumerated().map { Instruction(step: $0.offset + 1, $0.element) },
                                        prepMinutes: content.prepMinutes, cookMinutes: content.cookMinutes, servings: content.servings,
                                        sourceURL: content.sourceURL, createdAt: now)
            return ExportDocumentV2.RecipeRecord(id: id, currentVersion: 1, folderId: nil, parentRecipeId: nil, archivedAt: nil,
                                                 createdAt: now, updatedAt: now, tags: TagName.normalize(draft.tags),
                                                 versions: [ExportDocumentV2.VersionRecord(version)],
                                                 ratings: [], ratingClears: [], notes: [], photos: [])
        }
        return ExportDocumentV2(exportedAt: now, appBuild: "v1-import", folders: [], recipes: recipes)
    }

    static func describe(_ error: Error) -> String {
        if let decoding = error as? DecodingError {
            switch decoding {
            case .keyNotFound(let key, let context): return "missing “\(key.stringValue)” at \(path(context))"
            case .typeMismatch(_, let context): return "wrong type at \(path(context))"
            case .valueNotFound(_, let context): return "missing value at \(path(context))"
            case .dataCorrupted(let context): return context.debugDescription
            @unknown default: return "\(decoding)"
            }
        }
        return "\(error)"
    }

    static func path(_ context: DecodingError.Context) -> String {
        let joined = context.codingPath.map(\.stringValue).joined(separator: ".")
        return joined.isEmpty ? "top level" : joined
    }
}
