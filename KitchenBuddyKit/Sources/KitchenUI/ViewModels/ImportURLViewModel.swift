import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// The Import-from-URL sheet: paste or type, fetch with progress, then
/// hand a draft to the editor for review or explain the failure with a
/// manual-entry fallback that keeps the link as the source.
///
/// Requirements: kitchen-buddy-ios 12.3, 12.4
@MainActor @Observable
public final class ImportURLViewModel {
    public enum Phase: Equatable { case idle, loading, failed(String) }

    public let environment: AppEnvironment
    public var urlText: String
    public private(set) var phase: Phase = .idle
    public private(set) var result: RecipeURLImporter.Result?

    public init(environment: AppEnvironment, prefill: URL? = nil) {
        self.environment = environment
        urlText = prefill?.absoluteString ?? ""
    }

    public var canImport: Bool { RecipeURLImporter.normalizedURL(urlText) != nil && phase != .loading }
    public var sourceURL: URL? { RecipeURLImporter.normalizedURL(urlText) }

    public func importRecipe() async {
        guard canImport else { return }
        phase = .loading
        result = nil
        do {
            result = try await environment.urlImporter.importRecipe(from: urlText)
            phase = .idle
        } catch let error as RecipeURLImporter.ImportError {
            phase = .failed(error.explanation)
        } catch {
            phase = .failed("\(error)")
        }
    }

    /// The editor draft for manual entry: empty except the source link.
    public var manualDraft: RecipeDraft {
        RecipeDraft(title: "", sourceURL: sourceURL)
    }
}
