import KitchenCore

/// User settings, persisted immediately.
///
/// Requirements: kitchen-buddy-ios 18.1, 18.3
public protocol PreferencesStoring: Sendable {
    func load() throws -> Preferences
    func save(_ preferences: Preferences) throws
}
