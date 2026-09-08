/// The two measurement systems a convertible unit can belong to.
///
/// Requirements: kitchen-buddy-ios 9.1
public enum UnitSystem: String, CaseIterable, Codable, Hashable, Sendable {
    case us
    case metric
}
