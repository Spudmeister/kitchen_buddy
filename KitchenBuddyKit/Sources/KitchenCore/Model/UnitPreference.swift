/// How quantities are displayed: as written, or converted to one system.
/// The default lives in `Preferences`; the detail screen may override it
/// for one visit without changing the preference.
///
/// Requirements: kitchen-buddy-ios 9.3, 9.4, 18.1
public enum UnitPreference: String, CaseIterable, Codable, Hashable, Sendable {
    case original
    case us
    case metric

    /// The system to convert into, or nil to show quantities as written.
    public var system: UnitSystem? {
        switch self {
        case .original: return nil
        case .us: return .us
        case .metric: return .metric
        }
    }
}
