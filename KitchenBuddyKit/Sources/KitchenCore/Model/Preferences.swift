/// User settings. Persisted as key/value rows; every field has a default so
/// a missing key never fails to load.
///
/// Requirements: kitchen-buddy-ios 18.1, 18.3
public struct Preferences: Hashable, Codable, Sendable {
    public var unitPreference: UnitPreference
    /// nil means "off": open recipes at their own servings.
    public var defaultServings: Int?
    public var dietarySuggestionsEnabled: Bool
    public var groupLibraryByFolder: Bool
    public var iCloudBackupEnabled: Bool

    public init(unitPreference: UnitPreference = .original, defaultServings: Int? = nil,
                dietarySuggestionsEnabled: Bool = true, groupLibraryByFolder: Bool = false,
                iCloudBackupEnabled: Bool = true) {
        self.unitPreference = unitPreference
        self.defaultServings = defaultServings
        self.dietarySuggestionsEnabled = dietarySuggestionsEnabled
        self.groupLibraryByFolder = groupLibraryByFolder
        self.iCloudBackupEnabled = iCloudBackupEnabled
    }

    public static let `default` = Preferences()
}
