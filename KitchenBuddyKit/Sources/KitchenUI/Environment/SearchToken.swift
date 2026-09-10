import KitchenCore

/// A filter chip in the Library search field. Tokens map onto
/// `RecipeQuery` filters; `#tag` and `in:Folder` typed into the field are
/// interpreted the same way.
///
/// Requirements: kitchen-buddy-ios 6.2
public enum SearchToken: Identifiable, Hashable, Sendable {
    case tag(String)
    case folder(Folder.ID, name: String)
    case minimumRating(Int)
    case maximumMinutes(Int)
    case includeArchived
    /// Band is low for this profile (Requirement 21.8).
    case friendly(HealthProfile)

    public var id: String {
        switch self {
        case .tag(let name): return "tag:\(TagName.key(name))"
        case .folder(let id, _): return "folder:\(id)"
        case .minimumRating(let value): return "rating:\(value)"
        case .maximumMinutes(let minutes): return "time:\(minutes)"
        case .includeArchived: return "archived"
        case .friendly(let profile): return "friendly:\(profile.rawValue)"
        }
    }

    public var label: String {
        switch self {
        case .tag(let name): return name
        case .folder(_, let name): return "In \(name)"
        case .minimumRating(let value): return "\(value)+ stars"
        case .maximumMinutes(let minutes): return "Under \(DurationText.minutes(minutes))"
        case .includeArchived: return "Include archived"
        case .friendly(let profile): return profile.friendlyLabel
        }
    }

    public var systemImage: String {
        switch self {
        case .tag: return "tag"
        case .folder: return "folder"
        case .minimumRating: return "star"
        case .maximumMinutes: return "clock"
        case .includeArchived: return "archivebox"
        case .friendly(let profile): return profile.symbolName
        }
    }
}
