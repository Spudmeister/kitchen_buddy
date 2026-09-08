/// Keyword-based dietary detection, ported table-for-table from the PWA's
/// `tag-service.ts`. A tag is suggested when no ingredient name contains any
/// of its exclusion keywords (substring, case-insensitive). Pure and
/// deterministic; the UI attaches suggestions only after the user accepts.
///
/// Requirements: kitchen-buddy-ios 5.2, 5.3, 5.4
public enum TagDetector {
    public static let nonVeganIngredients: [String] = [
        "meat", "beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham", "sausage",
        "fish", "salmon", "tuna", "shrimp", "crab", "lobster", "seafood", "anchovy", "anchovies",
        "egg", "eggs",
        "milk", "cream", "butter", "cheese", "yogurt", "yoghurt", "whey", "casein",
        "honey", "gelatin", "lard",
    ]

    public static let nonVegetarianIngredients: [String] = [
        "meat", "beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham", "sausage",
        "fish", "salmon", "tuna", "shrimp", "crab", "lobster", "seafood", "anchovy", "anchovies",
        "gelatin", "lard",
    ]

    public static let glutenIngredients: [String] = [
        "wheat", "flour", "bread", "pasta", "noodle", "noodles", "spaghetti", "macaroni",
        "barley", "rye", "oat", "oats", "couscous", "bulgur", "semolina", "farina",
        "cracker", "crackers", "breadcrumb", "breadcrumbs", "panko",
        "beer", "malt", "seitan",
    ]

    public static let dairyIngredients: [String] = [
        "milk", "cream", "butter", "cheese", "yogurt", "yoghurt", "whey", "casein",
        "ghee", "sour cream", "cottage cheese", "ricotta", "mozzarella", "parmesan",
        "cheddar", "brie", "feta", "gouda", "swiss", "provolone", "mascarpone",
        "half-and-half", "half and half", "buttermilk", "ice cream",
    ]

    public static let nutIngredients: [String] = [
        "almond", "almonds", "walnut", "walnuts", "pecan", "pecans", "cashew", "cashews",
        "pistachio", "pistachios", "hazelnut", "hazelnuts", "macadamia", "brazil nut",
        "pine nut", "pine nuts", "chestnut", "chestnuts", "peanut", "peanuts",
        "nut butter", "almond butter", "peanut butter", "nutella",
    ]

    public static let highCarbIngredients: [String] = [
        "sugar", "flour", "bread", "pasta", "rice", "potato", "potatoes", "corn",
        "honey", "maple syrup", "molasses", "agave",
        "cereal", "oat", "oats", "oatmeal", "granola",
        "banana", "grape", "grapes", "mango", "pineapple",
        "candy", "chocolate", "cake", "cookie", "cookies", "pie", "pastry",
    ]

    /// Exclusion keywords per tag, in `DietaryTag.allCases` order.
    public static func exclusions(for tag: DietaryTag) -> [String] {
        switch tag {
        case .vegan: return nonVeganIngredients
        case .vegetarian: return nonVegetarianIngredients
        case .glutenFree: return glutenIngredients
        case .dairyFree: return dairyIngredients
        case .nutFree: return nutIngredients
        case .lowCarb: return highCarbIngredients
        }
    }

    /// The dietary tags the ingredient names qualify for.
    public static func detect(ingredientNames: [String]) -> [DietaryTag] {
        let names = ingredientNames.map { $0.lowercased() }
        return DietaryTag.allCases.filter { tag in
            !containsAny(names, exclusions(for: tag))
        }
    }

    public static func detect(_ ingredients: [IngredientDraft]) -> [DietaryTag] {
        detect(ingredientNames: ingredients.map(\.name))
    }

    /// Detected tags the recipe does not already carry — what the editor
    /// offers for confirmation.
    public static func suggestions(for content: RecipeContent, existingTags: [String]) -> [DietaryTag] {
        let existing = Set(existingTags.map(TagName.key))
        return detect(content.ingredients).filter { !existing.contains(TagName.key($0.rawValue)) }
    }

    private static func containsAny(_ names: [String], _ keywords: [String]) -> Bool {
        names.contains { name in keywords.contains { name.contains($0) } }
    }
}
