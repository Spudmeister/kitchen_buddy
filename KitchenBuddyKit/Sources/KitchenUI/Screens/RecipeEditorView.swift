import KitchenCore
import KitchenPersistence
import SwiftUI

/// The Recipe Editor sheet: a Form with reorderable ingredients and steps,
/// live fraction validation, tags and folder pickers, Save gated by the
/// rules, and a discard confirmation when dismissed with changes.
///
/// Requirements: kitchen-buddy-ios 1.1–1.6, 2.1, 2.2, 5.1, 16.1
public struct RecipeEditorView: View {
    @State private var model: RecipeEditorViewModel
    @Environment(\.dismiss) private var dismiss
    private let environment: AppEnvironment
    private let onSaved: (Recipe.ID) -> Void
    @State private var isTagPickerPresented = false
    @State private var isFolderPickerPresented = false
    @State private var isReordering = false

    public init(environment: AppEnvironment, model: RecipeEditorViewModel, onSaved: @escaping (Recipe.ID) -> Void = { _ in }) {
        self.environment = environment
        self.onSaved = onSaved
        _model = State(initialValue: model)
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $model.title)
                        .font(.headline)
                        .accessibilityIdentifier("titleField")
                    TextField("Description (optional)", text: $model.descriptionText, axis: .vertical)
                        .lineLimit(1...4)
                }

                // Rows iterate by their stable ids and move only in edit mode
                // (drag handles), so a long press on a text field never starts
                // a drag and the form keeps its scroll position.
                Section {
                    ForEach($model.ingredients) { $row in
                        IngredientRowEditor(row: $row)
                            .moveDisabled(!isReordering)
                    }
                    .onDelete { model.removeIngredients(at: $0) }
                    .onMove { model.moveIngredients(from: $0, to: $1) }
                    Button { model.addIngredient() } label: { Label("Add Ingredient", systemImage: "plus.circle") }
                        .accessibilityIdentifier("addIngredient")
                        .deleteDisabled(true)
                        .moveDisabled(true)
                } header: {
                    HStack { Text("Ingredients"); Spacer(); reorderToggle("reorderIngredients") }
                } footer: {
                    Text("Quantities take fractions: 1 1/2, ¾, 0.75.")
                }

                Section {
                    ForEach($model.steps) { $row in
                        StepRowEditor(number: (model.steps.firstIndex { $0.id == row.id } ?? 0) + 1, row: $row)
                            .moveDisabled(!isReordering)
                    }
                    .onDelete { model.removeSteps(at: $0) }
                    .onMove { model.moveSteps(from: $0, to: $1) }
                    Button { model.addStep() } label: { Label("Add Step", systemImage: "plus.circle") }
                        .accessibilityIdentifier("addStep")
                        .deleteDisabled(true)
                        .moveDisabled(true)
                } header: {
                    HStack { Text("Steps"); Spacer(); reorderToggle("reorderSteps") }
                }

                Section("Details") {
                    LabeledContent("Prep time") {
                        TextField("min", text: $model.prepText).multilineTextAlignment(.trailing).numberKeyboard()
                    }
                    LabeledContent("Cook time") {
                        TextField("min", text: $model.cookText).multilineTextAlignment(.trailing).numberKeyboard()
                    }
                    LabeledContent("Servings") {
                        TextField("e.g. 4", text: $model.servingsText).multilineTextAlignment(.trailing).numberKeyboard()
                    }
                    TextField("Source URL (optional)", text: $model.sourceText).urlKeyboard().autocorrectionDisabled()
                }

                Section {
                    Button { isTagPickerPresented = true } label: {
                        LabeledContent("Tags") {
                            Text(model.tags.isEmpty ? "None" : model.tags.joined(separator: ", "))
                                .foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                    .tint(.primary)
                    Button { isFolderPickerPresented = true } label: {
                        LabeledContent("Folder") {
                            Text(folderName).foregroundStyle(.secondary)
                        }
                    }
                    .tint(.primary)
                } header: {
                    Text("Organize")
                } footer: {
                    // Dietary suggestions: offered, never applied on their own (5.3, 5.4).
                    if !model.dietarySuggestions.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Looks like this recipe could be tagged:")
                            FlowLayout(spacing: 6) {
                                ForEach(model.dietarySuggestions, id: \.self) { suggestion in
                                    Button {
                                        model.accept(suggestion)
                                    } label: {
                                        Label(suggestion.displayName, systemImage: "plus")
                                            .font(.caption)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(.tint.opacity(0.12), in: Capsule())
                                    }
                                    .accessibilityLabel("Add tag \(suggestion.displayName)")
                                    .accessibilityIdentifier("suggest-\(suggestion.rawValue)")
                                }
                            }
                        }
                        .padding(.top, 4)
                    }
                }

                if !model.problems.isEmpty {
                    Section {
                        ForEach(model.problems, id: \.self) { problem in
                            Label(problem, systemImage: "exclamationmark.circle")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle(model.navigationTitle)
            .inlineTitle()
            .reorderMode(active: isReordering)
            .onChange(of: isReordering) { if isReordering { Keyboard.dismiss() } }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if model.hasChanges { model.isDiscardConfirmationPresented = true } else { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let id = model.save() {
                            onSaved(id)
                            dismiss()
                        }
                    }
                    .disabled(!model.canSave)
                    .accessibilityIdentifier("saveButton")
                }
            }
            .confirmationDialog("Discard changes?", isPresented: $model.isDiscardConfirmationPresented, titleVisibility: .visible) {
                Button("Discard Changes", role: .destructive) { dismiss() }
                Button("Keep Editing", role: .cancel) {}
            }
            .sheet(isPresented: $isTagPickerPresented) {
                TagPickerView(environment: environment, selection: $model.tags)
            }
            .sheet(isPresented: $isFolderPickerPresented) {
                FolderPickerView(environment: environment, selection: $model.folderID)
            }
            .alert("Couldn't save", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.error ?? "")
            }
        }
        .interactiveDismissDisabled(model.hasChanges)
    }

    private func reorderToggle(_ identifier: String) -> some View {
        Button(isReordering ? "Done" : "Reorder") { isReordering.toggle() }
            .font(.subheadline)
            .textCase(nil)
            .accessibilityIdentifier(identifier)
    }

    private var folderName: String {
        guard let id = model.folderID, let folder = try? environment.book.folders.folder(id) else { return "Unfiled" }
        return folder.name
    }
}

struct IngredientRowEditor: View {
    @Binding var row: RecipeEditorViewModel.IngredientRow
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // At accessibility sizes the amount and the name each get a line
            // instead of truncating side by side (Requirement 19.1).
            if typeSize.isAccessibilitySize {
                HStack(spacing: 8) { quantityField.frame(maxWidth: 120); unitPicker }
                nameField
            } else {
                HStack(spacing: 8) { quantityField.frame(width: 64); unitPicker.frame(minWidth: 72); nameField }
            }
            TextField("Notes (optional)", text: $row.notes)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var quantityField: some View {
        TextField("Qty", text: $row.quantityText)
            .numberKeyboard()
            .foregroundStyle(row.quantityIsValid ? .primary : Color.red)
            .accessibilityLabel("Quantity")
            .accessibilityValue(row.quantityIsValid ? row.quantityText : "\(row.quantityText), not a valid quantity")
    }

    private var unitPicker: some View {
        Picker("Unit", selection: $row.unit) {
            Text("—").tag(IngredientUnit?.none)
            ForEach(IngredientUnit.Category.allCases, id: \.self) { category in
                Section(category.rawValue.capitalized) {
                    ForEach(IngredientUnit.allCases.filter { $0.category == category }, id: \.self) { unit in
                        Text(unit.displayName).tag(IngredientUnit?.some(unit))
                    }
                }
            }
        }
        .labelsHidden()
    }

    private var nameField: some View {
        TextField("Ingredient", text: $row.name)
            .accessibilityIdentifier("ingredientName")
    }
}

struct StepRowEditor: View {
    let number: Int
    @Binding var row: RecipeEditorViewModel.StepRow

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.headline.monospacedDigit())
                .frame(width: 28, height: 28)
                .background(.quaternary, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                TextField("Step \(number)", text: $row.text, axis: .vertical)
                    .lineLimit(1...6)
                    .accessibilityLabel("Step \(number)")
                    .accessibilityIdentifier("stepText")
                HStack {
                    TextField("Minutes", text: $row.minutesText).frame(width: 80).numberKeyboard()
                    TextField("Notes (optional)", text: $row.notes)
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
    }
}
