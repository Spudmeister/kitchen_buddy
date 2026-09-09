/// A Library query: free text plus filters and a sort. Text matches word
/// prefixes across title, description, ingredients, steps, and tags; every
/// filter is a conjunction.
///
/// Requirements: kitchen-buddy-ios 6.1–6.3, 15.4
public struct RecipeQuery: Hashable, Codable, Sendable {
    public enum Sort: String, CaseIterable, Codable, Hashable, Sendable {
        case name, rating, dateAdded, dateUpdated, totalTime
    }

    public enum Direction: String, CaseIterable, Codable, Hashable, Sendable {
        case ascending, descending
    }

    public var text: String
    /// All must be present (AND); compared case-insensitively.
    public var tags: [String]
    public var minimumRating: Int?
    public var maximumTotalMinutes: Int?
    /// Restrict to this folder and its subfolders.
    public var folderID: Folder.ID?
    public var includeArchived: Bool
    /// Only recipes whose band for each of these profiles is low (Requirement 21.8).
    public var friendlyProfiles: Set<HealthProfile>
    public var sort: Sort
    public var direction: Direction

    public init(text: String = "", tags: [String] = [], minimumRating: Int? = nil,
                maximumTotalMinutes: Int? = nil, folderID: Folder.ID? = nil,
                includeArchived: Bool = false, friendlyProfiles: Set<HealthProfile> = [],
                sort: Sort = .name, direction: Direction = .ascending) {
        self.text = text
        self.tags = tags
        self.minimumRating = minimumRating
        self.maximumTotalMinutes = maximumTotalMinutes
        self.folderID = folderID
        self.includeArchived = includeArchived
        self.friendlyProfiles = friendlyProfiles
        self.sort = sort
        self.direction = direction
    }

    public static let all = RecipeQuery()

    public var hasFilters: Bool {
        !tags.isEmpty || minimumRating != nil || maximumTotalMinutes != nil || folderID != nil || includeArchived
            || !friendlyProfiles.isEmpty
    }
}
