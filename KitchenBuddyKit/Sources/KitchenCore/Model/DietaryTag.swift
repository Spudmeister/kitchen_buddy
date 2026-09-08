/// The built-in dietary tags. `TagDetector` suggests them from ingredient
/// names; they are attached only after the user accepts. The raw value is
/// the tag name as stored.
///
/// Requirements: kitchen-buddy-ios 5.2
public enum DietaryTag: String, CaseIterable, Codable, Hashable, Sendable {
    case vegan
    case vegetarian
    case glutenFree = "gluten-free"
    case dairyFree = "dairy-free"
    case nutFree = "nut-free"
    case lowCarb = "low-carb"

    public var displayName: String {
        switch self {
        case .vegan: return "Vegan"
        case .vegetarian: return "Vegetarian"
        case .glutenFree: return "Gluten-free"
        case .dairyFree: return "Dairy-free"
        case .nutFree: return "Nut-free"
        case .lowCarb: return "Low-carb"
        }
    }
}
