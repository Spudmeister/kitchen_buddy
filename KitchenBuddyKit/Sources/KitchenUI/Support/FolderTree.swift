import KitchenCore

/// Folder-tree helpers for pickers and sectioning.
public enum FolderTree {
    public struct Node: Identifiable, Hashable {
        public let folder: Folder
        public let depth: Int
        public var id: Folder.ID { folder.id }
    }

    /// Depth-first flattening, children sorted by name under their parent.
    public static func flattened(_ folders: [Folder]) -> [Node] {
        let byParent = Dictionary(grouping: folders, by: { $0.parentID })
        var result: [Node] = []
        func visit(_ parent: Folder.ID?, depth: Int, seen: inout Set<Folder.ID>) {
            for folder in (byParent[parent] ?? []).sorted(by: { $0.name.localizedStandardCompare($1.name) == .orderedAscending }) {
                guard seen.insert(folder.id).inserted else { continue }
                result.append(Node(folder: folder, depth: depth))
                visit(folder.id, depth: depth + 1, seen: &seen)
            }
        }
        var seen = Set<Folder.ID>()
        visit(nil, depth: 0, seen: &seen)
        return result
    }

    /// The root ancestor of `id` (itself when it has no parent).
    public static func topLevel(of id: Folder.ID, in folders: [Folder]) -> Folder? {
        let byID = Dictionary(uniqueKeysWithValues: folders.map { ($0.id, $0) })
        var cursor = byID[id]
        var visited = Set<Folder.ID>()
        while let current = cursor, let parentID = current.parentID, visited.insert(current.id).inserted,
              let parent = byID[parentID] {
            cursor = parent
        }
        return cursor
    }
}
