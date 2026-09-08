import Foundation

/// `Backups/manifest.json`: verification results keyed by snapshot file
/// name, so a snapshot is verified once and its badge survives relaunches.
/// Losing the manifest is harmless — snapshots are re-verified on demand.
struct SnapshotManifest: Codable {
    static let fileName = "manifest.json"

    var verifications: [String: Snapshot.Verification] = [:]

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return encoder
    }()

    static func load(from directory: URL) -> SnapshotManifest {
        let url = directory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: url),
              let manifest = try? decoder.decode(SnapshotManifest.self, from: data) else {
            return SnapshotManifest()
        }
        return manifest
    }

    func save(to directory: URL) throws {
        let data = try Self.encoder.encode(self)
        try data.write(to: directory.appendingPathComponent(Self.fileName), options: .atomic)
    }
}
