import KitchenCore

/// A filter chip in the Library search field. Tokens map onto
/// `RecipeQuery` filters; M4 adds rating and time tokens and the `#tag` /
/// `in:` shorthand.
///
/// Requirements: kitchen-buddy-ios 6.2
public enum SearchToken: Identifiable, Hashable, Sendable {
    case tag(String)
    case folder(Folder.ID, name: String)
    case includeArchived

    public var id: String {
        switch self {
        case .tag(let name): return "tag:\(TagName.key(name))"
        case .folder(let id, _): return "folder:\(id)"
        case .includeArchived: return "archived"
        }
    }

    public var label: String {
        switch self {
        case .tag(let name): return name
        case .folder(_, let name): return "In \(name)"
        case .includeArchived: return "Include archived"
        }
    }

    public var systemImage: String {
        switch self {
        case .tag: return "tag"
        case .folder: return "folder"
        case .includeArchived: return "archivebox"
        }
    }
}
