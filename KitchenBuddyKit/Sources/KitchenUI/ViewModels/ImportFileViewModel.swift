import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Import Review: validates a `.kbrecipes` / `.json` file, previews counts
/// and titles (flagging ids already present), and imports on confirm.
///
/// Requirements: kitchen-buddy-ios 14.1–14.5
@MainActor @Observable
public final class ImportFileViewModel {
    public let environment: AppEnvironment
    public private(set) var reading: ImportDocument.Reading?
    public private(set) var preview: ImportPreview?
    public private(set) var problems: [String] = []
    public var policy: ImportPolicy = .skipExisting
    public var destinationFolder: Folder.ID?
    public private(set) var isWorking = false
    public private(set) var summary: ImportSummary?
    public var error: String?

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public func load(_ url: URL) {
        let secured = url.startAccessingSecurityScopedResource()
        defer { if secured { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try Data(contentsOf: url)
            load(data: data)
        } catch {
            problems = ["Couldn't read the file: \(error.localizedDescription)"]
        }
    }

    public func load(data: Data) {
        problems = []
        do {
            let reading = try ImportDocument.read(data)
            self.reading = reading
            preview = try environment.book.importer.preview(reading)
        } catch let problem as ImportDocument.Problem {
            problems = [problem.description]
        } catch {
            problems = ["\(error)"]
        }
    }

    public var canImport: Bool { reading != nil && problems.isEmpty && !isWorking && summary == nil }

    public func performImport() async {
        guard let reading else { return }
        isWorking = true
        defer { isWorking = false }
        let book = environment.book
        let policy = policy
        let folder = destinationFolder
        do {
            summary = try await Task.detached(priority: .userInitiated) { try book.importer.perform(reading, policy: policy, destinationFolder: folder) }.value
        } catch {
            self.error = "Nothing was imported: \(error)"
        }
    }
}
