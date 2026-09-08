import KitchenCore

/// Nested folders. Deleting is soft and moves contents to the parent.
///
/// Requirements: kitchen-buddy-ios 16.1–16.6
public protocol FolderStoring: Sendable {
    func create(name: String, parentID: Folder.ID?) throws -> Folder
    func rename(_ id: Folder.ID, to name: String) throws -> Folder
    /// Throws `StoreError.folderCycle` for a move into itself or a descendant.
    func move(_ id: Folder.ID, toParent parentID: Folder.ID?) throws -> Folder
    /// Soft delete: recipes and subfolders move to the parent (or Unfiled).
    func delete(_ id: Folder.ID) throws
    /// Live folders sorted by name.
    func all() throws -> [Folder]
    func folder(_ id: Folder.ID) throws -> Folder?
    func children(of parentID: Folder.ID?) throws -> [Folder]
    /// The folder and every live descendant.
    func subtree(of id: Folder.ID) throws -> [Folder.ID]
    /// Non-archived recipe counts per folder, subfolders included.
    func recipeCounts() throws -> [Folder.ID: Int]
}
