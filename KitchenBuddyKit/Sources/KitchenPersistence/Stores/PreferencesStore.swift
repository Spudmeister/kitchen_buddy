import Foundation
import GRDB
import KitchenCore

/// Key/value settings. The `preferences` table is one of the few that may be
/// rewritten; it also holds housekeeping values such as the search index
/// version.
///
/// Requirements: kitchen-buddy-ios 18.1, 18.3
public final class PreferencesStore: PreferencesStoring {
    static let searchIndexVersionKey = "search_index_version"

    enum Key {
        static let unitPreference = "unit_preference"
        static let defaultServings = "default_servings"
        static let dietarySuggestions = "dietary_suggestions_enabled"
        static let groupByFolder = "group_library_by_folder"
        static let iCloudBackup = "icloud_backup_enabled"
        /// Comma-separated `HealthProfile` raw values; "" means none, a
        /// missing key means the default.
        static let healthProfiles = "health_profiles"
    }

    let handle: DatabaseHandle

    init(handle: DatabaseHandle) {
        self.handle = handle
    }

    var writer: any DatabaseWriter { handle.writer }

    public func load() throws -> Preferences {
        try writer.read { db in
            let rows = try Row.fetchAll(db, sql: "SELECT key, value FROM preferences")
            var values: [String: String] = [:]
            for row in rows { values[row["key"]] = row["value"] }
            let defaults = Preferences.default
            return Preferences(
                unitPreference: values[Key.unitPreference].flatMap(UnitPreference.init(rawValue:)) ?? defaults.unitPreference,
                defaultServings: values[Key.defaultServings].flatMap(Int.init).flatMap { $0 > 0 ? $0 : nil },
                dietarySuggestionsEnabled: values[Key.dietarySuggestions].map { $0 == "1" } ?? defaults.dietarySuggestionsEnabled,
                groupLibraryByFolder: values[Key.groupByFolder].map { $0 == "1" } ?? defaults.groupLibraryByFolder,
                iCloudBackupEnabled: values[Key.iCloudBackup].map { $0 == "1" } ?? defaults.iCloudBackupEnabled,
                enabledHealthProfiles: values[Key.healthProfiles].map { stored in
                    Set(stored.split(separator: ",").compactMap { HealthProfile(rawValue: String($0)) })
                } ?? defaults.enabledHealthProfiles
            )
        }
    }

    public func save(_ preferences: Preferences) throws {
        try writer.write { db in
            try Self.setValue(preferences.unitPreference.rawValue, forKey: Key.unitPreference, db)
            try Self.setValue(preferences.defaultServings.map(String.init), forKey: Key.defaultServings, db)
            try Self.setValue(preferences.dietarySuggestionsEnabled ? "1" : "0", forKey: Key.dietarySuggestions, db)
            try Self.setValue(preferences.groupLibraryByFolder ? "1" : "0", forKey: Key.groupByFolder, db)
            try Self.setValue(preferences.iCloudBackupEnabled ? "1" : "0", forKey: Key.iCloudBackup, db)
            try Self.setValue(preferences.healthProfiles.map(\.rawValue).joined(separator: ","), forKey: Key.healthProfiles, db)
        }
    }

    static func value(forKey key: String, _ db: Database) throws -> String? {
        try String.fetchOne(db, sql: "SELECT value FROM preferences WHERE key = ?", arguments: [key])
    }

    static func setValue(_ value: String?, forKey key: String, _ db: Database) throws {
        try db.execute(sql: """
            INSERT INTO preferences (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, arguments: [key, value])
    }
}
