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
    /// Health profiles whose badges, chips and worksheet rows show (M11).
    /// Diabetes on by default (Requirement 21.7).
    public var enabledHealthProfiles: Set<HealthProfile>

    public init(unitPreference: UnitPreference = .original, defaultServings: Int? = nil,
                dietarySuggestionsEnabled: Bool = true, groupLibraryByFolder: Bool = false,
                iCloudBackupEnabled: Bool = true, enabledHealthProfiles: Set<HealthProfile> = [.diabetes]) {
        self.unitPreference = unitPreference
        self.defaultServings = defaultServings
        self.dietarySuggestionsEnabled = dietarySuggestionsEnabled
        self.groupLibraryByFolder = groupLibraryByFolder
        self.iCloudBackupEnabled = iCloudBackupEnabled
        self.enabledHealthProfiles = enabledHealthProfiles
    }

    /// Enabled profiles in display order.
    public var healthProfiles: [HealthProfile] { HealthProfile.allCases.filter { enabledHealthProfiles.contains($0) } }

    public static let `default` = Preferences()
}
