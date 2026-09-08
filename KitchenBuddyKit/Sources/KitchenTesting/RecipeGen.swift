import Foundation
import KitchenCore

/// Seeded generators for the recipe domain. Words come from a fixed
/// vocabulary of plain ASCII so search properties can reason about tokens;
/// a few accented words are mixed in to exercise diacritic folding.
///
/// Requirements: kitchen-buddy-ios design "Testing Strategy"
public enum RecipeGen {
    public static let vocabulary: [String] = [
        "apple", "basil", "butter", "carrot", "cheddar", "chicken", "chili", "cinnamon", "cocoa",
        "coriander", "cream", "cumin", "dill", "egg", "fennel", "flour", "garlic", "ginger",
        "honey", "kale", "leek", "lemon", "lentil", "lime", "mango", "milk", "mint", "mushroom",
        "mustard", "noodle", "nutmeg", "oat", "olive", "onion", "orange", "oregano", "paprika",
        "parsley", "pasta", "peach", "pear", "pepper", "pork", "potato", "pumpkin", "quinoa",
        "radish", "rice", "rosemary", "saffron", "sage", "salmon", "salt", "shallot", "spinach",
        "squash", "sugar", "tarragon", "thyme", "tofu", "tomato", "turmeric", "vanilla", "vinegar",
        "walnut", "yogurt", "zucchini", "crème", "jalapeño", "purée", "sauté", "brûlée",
    ]

    public static let verbs: [String] = [
        "chop", "dice", "whisk", "simmer", "roast", "toast", "fold", "knead", "rest", "sear",
        "braise", "grill", "blend", "season", "drain", "chill", "garnish", "serve",
    ]

    public static let tagNames: [String] = [
        "breakfast", "lunch", "dinner", "dessert", "snack", "quick", "weeknight", "holiday",
        "italian", "mexican", "thai", "indian", "french", "vegan", "vegetarian", "gluten-free",
        "dairy-free", "nut-free", "low-carb", "soup", "salad", "baking", "grill", "slow cooker",
    ]

    public static var word: Gen<String> { Gen<String>.element(of: vocabulary) }
    public static var verb: Gen<String> { Gen<String>.element(of: verbs) }
    public static var tag: Gen<String> { Gen<String>.element(of: tagNames) }

    public static func phrase(words: ClosedRange<Int>) -> Gen<String> {
        Gen<[String]>.array(of: word, count: words).map { $0.joined(separator: " ") }
    }

    public static var title: Gen<String> {
        Gen<String> { rng in
            let count = Int.random(in: 1...3, using: &rng)
            let words = (0..<count).map { _ in word.run(&rng) }
            return words.map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined(separator: " ")
        }
    }

    public static var unit: Gen<IngredientUnit?> {
        Gen<IngredientUnit>.element(of: IngredientUnit.allCases).optional(probability: 0.85)
    }

    public static var convertibleUnit: Gen<IngredientUnit> {
        Gen<IngredientUnit>.element(of: IngredientUnit.allCases.filter(\.isConvertible))
    }

    public static var ingredient: Gen<IngredientDraft> {
        Gen<IngredientDraft> { rng in
            let name = phrase(words: 1...2).run(&rng)
            let quantity = Gen<Fraction>.quantity.optional(probability: 0.9).run(&rng)
            let unit = quantity == nil ? nil : unit.run(&rng)
            return IngredientDraft(
                name: name,
                quantity: quantity,
                unit: unit,
                notes: verb.map { "\($0)ped" }.optional(probability: 0.3).run(&rng),
                category: Gen<IngredientCategory>.element(of: IngredientCategory.allCases).optional(probability: 0.7).run(&rng)
            )
        }
    }

    public static var storedIngredient: Gen<Ingredient> {
        ingredient.map { Ingredient($0) }
    }

    public static var instruction: Gen<InstructionDraft> {
        Gen<InstructionDraft> { rng in
            let verb = verb.run(&rng)
            let objects = phrase(words: 1...4).run(&rng)
            return InstructionDraft(
                text: "\(verb.prefix(1).uppercased() + verb.dropFirst()) the \(objects).",
                durationMinutes: Gen<Int>.int(in: 1...90).optional(probability: 0.6).run(&rng),
                notes: word.optional(probability: 0.2).run(&rng)
            )
        }
    }

    /// Valid content: a title, 1–8 named ingredients, 1–6 steps.
    public static var content: Gen<RecipeContent> {
        Gen<RecipeContent> { rng in
            RecipeContent(
                title: title.run(&rng),
                description: phrase(words: 2...8).optional(probability: 0.7).run(&rng),
                ingredients: Gen<[IngredientDraft]>.array(of: ingredient, count: 1...8).run(&rng),
                instructions: Gen<[InstructionDraft]>.array(of: instruction, count: 1...6).run(&rng),
                prepMinutes: Gen<Int>.int(in: 0...120).optional(probability: 0.8).run(&rng),
                cookMinutes: Gen<Int>.int(in: 0...240).optional(probability: 0.8).run(&rng),
                servings: Gen<Int>.int(in: 1...12).optional(probability: 0.85).run(&rng),
                sourceURL: Gen<String>.element(of: ["https://example.com/r/1", "https://cook.example/pie"])
                    .map { URL(string: $0) }.optional(probability: 0.3).run(&rng) ?? nil
            )
        }
    }

    public static var tags: Gen<[String]> {
        Gen<[String]>.array(of: tag, count: 0...4)
    }

    /// A valid draft with 0–4 tags and no folder.
    public static var draft: Gen<RecipeDraft> {
        Gen<RecipeDraft> { rng in
            RecipeDraft(content: content.run(&rng), tags: tags.run(&rng))
        }
    }

    public static func drafts(count: ClosedRange<Int>) -> Gen<[RecipeDraft]> {
        Gen<[RecipeDraft]>.array(of: draft, count: count)
    }

    /// A content edit that always changes something versioned.
    public static func edited(_ content: RecipeContent) -> Gen<RecipeContent> {
        Gen<RecipeContent> { rng in
            var copy = content
            switch Int.random(in: 0..<5, using: &rng) {
            case 0: copy.title = content.title + " " + word.run(&rng).capitalized
            case 1: copy.ingredients.append(ingredient.run(&rng))
            case 2: copy.instructions.append(instruction.run(&rng))
            case 3: copy.servings = (content.servings ?? 0) + Int.random(in: 1...4, using: &rng)
            default: copy.description = (content.description ?? "") + " " + word.run(&rng)
            }
            return copy
        }
    }

    /// A folder tree as (name, parent index into the same array, or nil).
    /// Parents always precede children so it can be created in order.
    public struct FolderSpec: Hashable, Sendable {
        public let name: String
        public let parentIndex: Int?
    }

    public static func folderTree(count: ClosedRange<Int>) -> Gen<[FolderSpec]> {
        Gen<[FolderSpec]> { rng in
            let n = Int.random(in: count, using: &rng)
            return (0..<n).map { index in
                let parent = index == 0 || Bool.random(using: &rng) ? nil : Int.random(in: 0..<index, using: &rng)
                return FolderSpec(name: "\(word.run(&rng).capitalized) \(index)", parentIndex: parent)
            }
        }
    }
}
