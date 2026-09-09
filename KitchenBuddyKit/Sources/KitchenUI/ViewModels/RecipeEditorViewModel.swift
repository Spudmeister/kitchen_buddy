import Foundation
import KitchenCore
import KitchenPersistence
import Observation

/// Editor state for a new or existing recipe: text fields as typed, rows
/// with stable ids for reorder/delete, live quantity validation, the Save
/// rules, and change tracking for the discard confirmation. Saving goes
/// through the store, which versions only real content changes.
///
/// Requirements: kitchen-buddy-ios 1.1–1.6, 2.1, 2.2
@MainActor @Observable
public final class RecipeEditorViewModel {
    public struct IngredientRow: Identifiable, Hashable {
        public let id: UUID
        public var name: String
        public var quantityText: String
        public var unit: IngredientUnit?
        public var notes: String
        public var category: IngredientCategory?

        public init(id: UUID = UUID(), name: String = "", quantityText: String = "", unit: IngredientUnit? = nil,
                    notes: String = "", category: IngredientCategory? = nil) {
            self.id = id
            self.name = name
            self.quantityText = quantityText
            self.unit = unit
            self.notes = notes
            self.category = category
        }

        public init(_ draft: IngredientDraft) {
            self.init(name: draft.name, quantityText: draft.quantity.map(QuantityFormatter.string(for:)) ?? "",
                      unit: draft.unit, notes: draft.notes ?? "", category: draft.category)
        }

        public var quantity: Fraction? { QuantityParser.parse(quantityText) }
        public var quantityIsValid: Bool {
            quantityText.trimmingCharacters(in: .whitespaces).isEmpty || quantity != nil
        }

        public var draft: IngredientDraft {
            IngredientDraft(name: name, quantity: quantity, unit: unit, notes: notes, category: category)
        }
    }

    public struct StepRow: Identifiable, Hashable {
        public let id: UUID
        public var text: String
        public var minutesText: String
        public var notes: String

        public init(id: UUID = UUID(), text: String = "", minutesText: String = "", notes: String = "") {
            self.id = id
            self.text = text
            self.minutesText = minutesText
            self.notes = notes
        }

        public init(_ draft: InstructionDraft) {
            self.init(text: draft.text, minutesText: draft.durationMinutes.map(String.init) ?? "", notes: draft.notes ?? "")
        }

        public var draft: InstructionDraft {
            InstructionDraft(text: text, durationMinutes: Int(minutesText.trimmingCharacters(in: .whitespaces)), notes: notes)
        }
    }

    public let environment: AppEnvironment
    public let editingID: Recipe.ID?
    public var title = ""
    public var descriptionText = ""
    public var ingredients: [IngredientRow] = [IngredientRow()]
    public var steps: [StepRow] = [StepRow()]
    public var prepText = ""
    public var cookText = ""
    public var servingsText = ""
    public var sourceText = ""
    public var tags: [String] = []
    public var folderID: Folder.ID?
    public var error: String?
    public var isDiscardConfirmationPresented = false
    private let original: RecipeDraft?

    /// A new recipe, optionally in a folder.
    public init(environment: AppEnvironment, newIn folderID: Folder.ID? = nil) {
        self.environment = environment
        self.editingID = nil
        self.folderID = folderID
        self.original = nil
    }

    /// Editing an existing recipe from its current version.
    public init(environment: AppEnvironment, editing detail: RecipeDetail) {
        self.environment = environment
        self.editingID = detail.id
        let draft = detail.draft
        title = draft.content.title
        descriptionText = draft.content.description ?? ""
        ingredients = draft.content.ingredients.map(IngredientRow.init)
        steps = draft.content.instructions.map(StepRow.init)
        prepText = draft.content.prepMinutes.map(String.init) ?? ""
        cookText = draft.content.cookMinutes.map(String.init) ?? ""
        servingsText = draft.content.servings.map(String.init) ?? ""
        sourceText = draft.content.sourceURL?.absoluteString ?? ""
        tags = draft.tags
        folderID = draft.folderID
        original = draft.normalized()
    }

    /// Loads the recipe to edit; nil when it no longer exists.
    public static func editing(_ id: Recipe.ID, in environment: AppEnvironment) -> RecipeEditorViewModel? {
        guard let detail = try? environment.book.recipes.detail(id) else { return nil }
        return RecipeEditorViewModel(environment: environment, editing: detail)
    }

    public var isNew: Bool { editingID == nil }
    public var navigationTitle: String { isNew ? "New Recipe" : "Edit Recipe" }

    // MARK: Draft and validation

    public var draft: RecipeDraft {
        RecipeDraft(
            content: RecipeContent(
                title: title,
                description: descriptionText,
                ingredients: ingredients.map(\.draft),
                instructions: steps.map(\.draft),
                prepMinutes: Int(prepText.trimmingCharacters(in: .whitespaces)),
                cookMinutes: Int(cookText.trimmingCharacters(in: .whitespaces)),
                servings: Int(servingsText.trimmingCharacters(in: .whitespaces)),
                sourceURL: sourceURL),
            tags: tags, folderID: folderID)
    }

    /// A web address: http(s) scheme and a host. `URL(string:)` alone
    /// accepts almost anything since it started percent-encoding.
    private var sourceURL: URL? {
        let trimmed = sourceText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let components = URLComponents(string: trimmed),
              let scheme = components.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = components.host, !host.isEmpty, host.contains(".") || host == "localhost" else { return nil }
        return components.url
    }

    public var validationErrors: [RecipeDraft.ValidationError] { draft.validationErrors }
    public var hasInvalidQuantity: Bool { ingredients.contains { !$0.quantityIsValid } }
    public var hasInvalidSource: Bool {
        !sourceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && sourceURL == nil
    }

    /// Every rule that currently blocks Save, in display order.
    public var problems: [String] {
        var problems = validationErrors.map(\.description)
        if hasInvalidQuantity { problems.append("Enter quantities like 1, 1/2, 1 1/2, ¾ or 0.75.") }
        if hasInvalidSource { problems.append("The source must be a web address.") }
        return problems
    }

    public var canSave: Bool { problems.isEmpty }

    public var hasChanges: Bool {
        guard let original else {
            return !title.isEmpty || !descriptionText.isEmpty || ingredients.contains { !$0.name.isEmpty }
                || steps.contains { !$0.text.isEmpty } || !tags.isEmpty
        }
        return draft.normalized() != original
    }

    // MARK: Rows

    public func addIngredient() { ingredients.append(IngredientRow()) }
    public func removeIngredients(at offsets: IndexSet) { ingredients.remove(atOffsets: offsets) }
    public func moveIngredients(from source: IndexSet, to destination: Int) {
        ingredients.move(fromOffsets: source, toOffset: destination)
    }

    public func addStep() { steps.append(StepRow()) }
    public func removeSteps(at offsets: IndexSet) { steps.remove(atOffsets: offsets) }
    public func moveSteps(from source: IndexSet, to destination: Int) {
        steps.move(fromOffsets: source, toOffset: destination)
    }

    // MARK: Save

    /// Creates or updates the recipe; returns its id, or nil on failure
    /// (with `error` set).
    @discardableResult
    public func save() -> Recipe.ID? {
        guard canSave else { return nil }
        do {
            let book = environment.book
            let saved = try editingID.map { try book.recipes.save(draft, for: $0) } ?? (try book.recipes.create(draft))
            return saved.id
        } catch {
            self.error = "\(error)"
            return nil
        }
    }
}
