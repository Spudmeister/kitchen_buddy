import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Export / Share: PDF or `.kbrecipes`, share vs backup preset, photos
/// switch with size estimate. Files are written to a temporary directory
/// for `ShareLink`.
///
/// Requirements: kitchen-buddy-ios 13.1, 13.3, 13.5
@MainActor @Observable
public final class ShareViewModel {
    public enum Kind: String, CaseIterable { case file, pdf }

    public let environment: AppEnvironment
    public let scope: ExportOptions.Scope
    public var kind: Kind = .file
    public var includePhotos = true
    public var includeHistory: Bool
    public private(set) var fileURL: URL?
    public private(set) var estimatedBytes: Int64?
    public private(set) var isWorking = false
    public var error: String?
    /// For PDFs: the detail as currently scaled/converted on screen.
    public var pdfInput: PDFRenderer.Input?

    public init(environment: AppEnvironment, scope: ExportOptions.Scope, backup: Bool = false) {
        self.environment = environment
        self.scope = scope
        includeHistory = backup
        if case .recipe = scope {} else { kind = .file }
    }

    public var canMakePDF: Bool { if case .recipe = scope { return true } else { return false } }

    public var options: ExportOptions {
        ExportOptions(scope: scope, includePhotos: includePhotos, includeHistory: includeHistory)
    }

    public var suggestedName: String {
        switch scope {
        case .recipe(let id): return ((try? environment.book.recipes.detail(id))?.title ?? "Recipe").replacingOccurrences(of: "/", with: "-")
        case .folder(let id): return (try? environment.book.folders.folder(id))?.name ?? "Folder"
        case .all: return "Kitchen Buddy Backup \(Date().formatted(.iso8601.year().month().day()))"
        }
    }

    /// Writes the file for the current settings and returns its URL.
    public func prepare() async {
        isWorking = true
        defer { isWorking = false }
        let book = environment.book
        let options = options
        let name = suggestedName
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("KitchenBuddyShare", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            switch kind {
            case .file:
                let data = try await Task.detached(priority: .userInitiated) { try book.exporter.exportData(options) }.value
                let url = directory.appendingPathComponent("\(name).kbrecipes")
                try data.write(to: url, options: .atomic)
                fileURL = url
                estimatedBytes = Int64(data.count)
            case .pdf:
                guard let input = pdfInput else { throw CocoaError(.fileNoSuchFile) }
                let data = try PDFRenderer.render(input)
                let url = directory.appendingPathComponent("\(name).pdf")
                try data.write(to: url, options: .atomic)
                fileURL = url
                estimatedBytes = Int64(data.count)
            }
        } catch {
            self.error = "\(error)"
        }
    }
}
