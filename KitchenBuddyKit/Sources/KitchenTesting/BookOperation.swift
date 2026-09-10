import Foundation
import KitchenCore
import KitchenPersistence

/// One public-API operation on a `RecipeBook`, drawn at random and applied
/// by `BookDriver`. Indices refer to the driver's ordered lists of recipes,
/// folders, and notes and are taken modulo their counts, so any sequence
/// is applicable to any state.
///
/// Requirements: kitchen-buddy-ios design P6, P32
public enum BookOperation: Hashable, Sendable {
    case create(RecipeDraft)
    case editContent(recipe: Int)
    case saveUnchanged(recipe: Int)
    case setTags(recipe: Int, tags: [String])
    case addTag(recipe: Int, tag: String)
    case removeTag(recipe: Int, tag: String)
    case rate(recipe: Int, value: Int)
    case clearRating(recipe: Int)
    case archive(recipe: Int)
    case unarchive(recipe: Int)
    case restore(recipe: Int, version: Int)
    case duplicate(recipe: Int)
    case addNote(recipe: Int, body: String)
    case editNote(note: Int, body: String)
    case pinNote(note: Int, pinned: Bool)
    case deleteNote(note: Int)
    case undeleteNote(note: Int)
    case createFolder(name: String, parent: Int?)
    case renameFolder(folder: Int, name: String)
    case moveFolder(folder: Int, parent: Int?)
    case deleteFolder(folder: Int)
    case moveRecipe(recipe: Int, folder: Int?)
    case savePreferences(Preferences)
    case snapshot(Snapshot.Reason)
    case prune
    case reportServings(recipe: Int, servings: Int?)
    case overrideFood(recipe: Int, ingredient: Int, food: String?)
    case clearOverride(recipe: Int, ingredient: Int)

    public static var gen: Gen<BookOperation> {
        Gen<BookOperation> { rng in
            let index = Gen<Int>.int(in: 0...1_000)
            let maybeIndex = index.optional(probability: 0.8)
            switch Int.random(in: 0..<27, using: &rng) {
            case 0, 1, 2: return .create(RecipeGen.draft.run(&rng))
            case 3: return .editContent(recipe: index.run(&rng))
            case 4: return .saveUnchanged(recipe: index.run(&rng))
            case 5: return .setTags(recipe: index.run(&rng), tags: RecipeGen.tags.run(&rng))
            case 6: return .addTag(recipe: index.run(&rng), tag: RecipeGen.tag.run(&rng))
            case 7: return .removeTag(recipe: index.run(&rng), tag: RecipeGen.tag.run(&rng))
            case 8: return Bool.random(using: &rng) ? .rate(recipe: index.run(&rng), value: Int.random(in: 1...5, using: &rng)) : .clearRating(recipe: index.run(&rng))
            case 9: return .archive(recipe: index.run(&rng))
            case 10: return .unarchive(recipe: index.run(&rng))
            case 11: return .restore(recipe: index.run(&rng), version: index.run(&rng))
            case 12: return .duplicate(recipe: index.run(&rng))
            case 13: return .addNote(recipe: index.run(&rng), body: RecipeGen.phrase(words: 1...6).run(&rng))
            case 14: return .editNote(note: index.run(&rng), body: RecipeGen.phrase(words: 1...6).run(&rng))
            case 15: return .pinNote(note: index.run(&rng), pinned: Bool.random(using: &rng))
            case 16: return Bool.random(using: &rng) ? .deleteNote(note: index.run(&rng)) : .undeleteNote(note: index.run(&rng))
            case 17: return .createFolder(name: RecipeGen.word.run(&rng).capitalized, parent: maybeIndex.run(&rng))
            case 18: return .renameFolder(folder: index.run(&rng), name: RecipeGen.word.run(&rng).capitalized)
            case 19: return Bool.random(using: &rng) ? .moveFolder(folder: index.run(&rng), parent: maybeIndex.run(&rng)) : .deleteFolder(folder: index.run(&rng))
            case 20: return .moveRecipe(recipe: index.run(&rng), folder: maybeIndex.run(&rng))
            case 22:
                return .snapshot(Gen<Snapshot.Reason>.element(of: [.manual, .background, .daily, .preImport]).run(&rng))
            case 23:
                return .prune
            case 24:
                return .reportServings(recipe: index.run(&rng), servings: Gen<Int>.int(in: 1...16).optional(probability: 0.8).run(&rng))
            case 25:
                return .overrideFood(recipe: index.run(&rng), ingredient: index.run(&rng),
                                     food: Gen<String>.element(of: FoodTable.foods.map(\.id)).optional(probability: 0.7).run(&rng))
            case 26:
                return .clearOverride(recipe: index.run(&rng), ingredient: index.run(&rng))
            default:
                return .savePreferences(Preferences(
                    unitPreference: Gen<UnitPreference>.element(of: UnitPreference.allCases).run(&rng),
                    defaultServings: Gen<Int>.int(in: 1...10).optional().run(&rng) ?? nil,
                    dietarySuggestionsEnabled: Bool.random(using: &rng),
                    groupLibraryByFolder: Bool.random(using: &rng),
                    iCloudBackupEnabled: Bool.random(using: &rng)))
            }
        }
    }

    public static func sequence(length: ClosedRange<Int>) -> Gen<[BookOperation]> {
        Gen<[BookOperation]>.array(of: gen, count: length)
    }
}

/// Applies `BookOperation`s to a book, tracking the ids it creates. Errors
/// the API is specified to throw (folder cycles) are swallowed; anything
/// else propagates as a test failure.
public final class BookDriver {
    public let book: RecipeBook
    public private(set) var recipeIDs: [Recipe.ID] = []
    public private(set) var folderIDs: [Folder.ID] = []
    public private(set) var noteIDs: [RecipeNote.ID] = []
    public private(set) var applied: [BookOperation] = []

    public init(book: RecipeBook) { self.book = book }

    public func apply(_ operations: [BookOperation]) throws {
        for operation in operations { try apply(operation) }
    }

    public func apply(_ operation: BookOperation) throws {
        applied.append(operation)
        switch operation {
        case .create(let draft):
            recipeIDs.append(try book.recipes.create(draft).id)
        case .editContent(let index):
            guard let id = recipe(index), let detail = try book.recipes.detail(id) else { return }
            var rng = SeededRandomSource(seed: UInt64(applied.count))
            var draft = detail.draft
            draft.content = RecipeGen.edited(draft.content).run(&rng)
            _ = try book.recipes.save(draft, for: id)
        case .saveUnchanged(let index):
            guard let id = recipe(index), let detail = try book.recipes.detail(id) else { return }
            _ = try book.recipes.save(detail.draft, for: id)
        case .setTags(let index, let tags):
            guard let id = recipe(index) else { return }
            try book.recipes.setTags(tags, for: id)
        case .addTag(let index, let tag):
            guard let id = recipe(index) else { return }
            try book.tags.add(tag, to: id)
        case .removeTag(let index, let tag):
            guard let id = recipe(index) else { return }
            try book.tags.remove(tag, from: id)
        case .rate(let index, let value):
            guard let id = recipe(index) else { return }
            try book.recipes.rate(id, value: value)
        case .clearRating(let index):
            guard let id = recipe(index) else { return }
            try book.recipes.clearRating(id)
        case .archive(let index):
            guard let id = recipe(index) else { return }
            try book.recipes.archive(id)
        case .unarchive(let index):
            guard let id = recipe(index) else { return }
            try book.recipes.unarchive(id)
        case .restore(let index, let version):
            guard let id = recipe(index), let current = try book.recipes.detail(id) else { return }
            _ = try book.recipes.restore(id, toVersion: version % current.recipe.currentVersion + 1)
        case .duplicate(let index):
            guard let id = recipe(index) else { return }
            recipeIDs.append(try book.recipes.duplicate(id).id)
        case .addNote(let index, let body):
            guard let id = recipe(index) else { return }
            noteIDs.append(try book.recipes.addNote(to: id, body: body, cookedOn: nil).id)
        case .editNote(let index, let body):
            guard let id = note(index) else { return }
            try book.recipes.updateNote(id, body: body, cookedOn: nil)
        case .pinNote(let index, let pinned):
            guard let id = note(index) else { return }
            try book.recipes.setNotePinned(id, pinned)
        case .deleteNote(let index):
            guard let id = note(index) else { return }
            try book.recipes.deleteNote(id)
        case .undeleteNote(let index):
            guard let id = note(index) else { return }
            try book.recipes.undeleteNote(id)
        case .createFolder(let name, let parent):
            let parentID = try parent.flatMap(liveFolder)
            folderIDs.append(try book.folders.create(name: name, parentID: parentID).id)
        case .renameFolder(let index, let name):
            guard let id = try liveFolder(index) else { return }
            _ = try book.folders.rename(id, to: name)
        case .moveFolder(let index, let parent):
            guard let id = try liveFolder(index) else { return }
            let parentID = try parent.flatMap(liveFolder)
            do { _ = try book.folders.move(id, toParent: parentID) } catch StoreError.folderCycle {}
        case .deleteFolder(let index):
            guard let id = try liveFolder(index) else { return }
            try book.folders.delete(id)
        case .moveRecipe(let index, let folder):
            guard let id = recipe(index) else { return }
            let folderID = try folder.flatMap(liveFolder)
            try book.recipes.move(id, toFolder: folderID)
        case .savePreferences(let preferences):
            try book.preferences.save(preferences)
        case .snapshot(let reason):
            try book.backups.snapshot(reason: reason)
        case .reportServings(let index, let servings):
            guard let id = recipe(index) else { return }
            try book.recipes.reportServings(id, servings: servings, note: nil)
        case .overrideFood(let index, let ingredientIndex, let food):
            guard let id = recipe(index), let detail = try book.recipes.detail(id),
                  !detail.version.ingredients.isEmpty else { return }
            let name = detail.version.ingredients[ingredientIndex % detail.version.ingredients.count].name
            try book.recipes.setFoodOverride(id, ingredientName: name, foodID: food)
        case .clearOverride(let index, let ingredientIndex):
            guard let id = recipe(index), let detail = try book.recipes.detail(id),
                  !detail.version.ingredients.isEmpty else { return }
            let name = detail.version.ingredients[ingredientIndex % detail.version.ingredients.count].name
            try book.recipes.clearFoodOverride(id, ingredientName: name)
        case .prune:
            try book.backups.prune()
        }
    }

    private func recipe(_ index: Int) -> Recipe.ID? {
        recipeIDs.isEmpty ? nil : recipeIDs[index % recipeIDs.count]
    }

    private func note(_ index: Int) -> RecipeNote.ID? {
        noteIDs.isEmpty ? nil : noteIDs[index % noteIDs.count]
    }

    private func liveFolder(_ index: Int) throws -> Folder.ID? {
        guard !folderIDs.isEmpty else { return nil }
        let id = folderIDs[index % folderIDs.count]
        return try book.folders.folder(id)?.deletedAt == nil ? id : nil
    }
}
