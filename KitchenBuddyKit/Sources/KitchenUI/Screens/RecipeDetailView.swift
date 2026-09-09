import KitchenCore
import KitchenPersistence
import SwiftUI

/// Recipe Detail: title block, times and servings, version badge, rating,
/// tags, folder, ingredients with tap-to-check, numbered steps, source,
/// notes count, and the toolbar actions. Archived recipes and past versions
/// are read-only. Servings scaling and unit switching arrive in M4, photos
/// in M6, notes and lineage sections in M5.
///
/// Requirements: kitchen-buddy-ios 3.1, 3.3, 3.4, 10.1–10.4
public struct RecipeDetailView: View {
    @State private var model: RecipeDetailViewModel
    private let environment: AppEnvironment
    @State private var confirmRestore = false

    public init(environment: AppEnvironment, recipeID: Recipe.ID, versionNumber: Int? = nil) {
        self.environment = environment
        _model = State(initialValue: RecipeDetailViewModel(environment: environment, recipeID: recipeID, versionNumber: versionNumber))
    }

    public var body: some View {
        mainContent
            .navigationTitle(model.isPastVersion ? "Version \(model.versionNumber ?? 0)" : "")
            .inlineTitle()
            .toolbar { detailToolbar }
            .task { model.load() }
            .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
            .sensoryFeedback(.success, trigger: model.ratingFeedbackTrigger)
            .modifier(RestoreDialog(model: model, environment: environment, isPresented: $confirmRestore))
            .alert("Recipe", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.error ?? "")
            }
    }

    @ViewBuilder
    private var mainContent: some View {
        if let detail = model.detail {
            content(detail)
        } else if model.isMissing {
            ContentUnavailableView("Recipe not found", systemImage: "questionmark.folder")
        } else {
            ProgressView()
        }
    }

    private enum ToolbarMode { case editable(Recipe.ID), archived, pastVersion, none }

    private var toolbarMode: ToolbarMode {
        guard let detail = model.detail else { return .none }
        if !model.isReadOnly { return .editable(detail.id) }
        if model.isArchived, !model.isPastVersion { return .archived }
        if model.isPastVersion, !model.isArchived { return .pastVersion }
        return .none
    }

    @ToolbarContentBuilder
    private var detailToolbar: some ToolbarContent {
        switch toolbarMode {
        case .editable(let id):
            EditableToolbar(model: model, environment: environment, recipeID: id)
        case .archived:
            ToolbarItem(placement: .primaryAction) {
                Button("Unarchive") { model.unarchive() }.accessibilityIdentifier("unarchiveButton")
            }
        case .pastVersion:
            ToolbarItem(placement: .primaryAction) {
                Button("Restore…") { confirmRestore = true }.accessibilityIdentifier("restoreButton")
            }
        case .none:
            ToolbarItem(placement: .primaryAction) { EmptyView() }
        }
    }

    @ViewBuilder
    private func content(_ detail: RecipeDetail) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 20, pinnedViews: [.sectionHeaders]) {
                if let archivedAt = detail.recipe.archivedAt {
                    Label("Archived \(archivedAt.formatted(date: .abbreviated, time: .omitted)). Unarchive to edit.",
                          systemImage: "archivebox")
                        .font(.subheadline)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))
                }

                if !detail.photos.isEmpty {
                    PhotoHeader(environment: environment, recipeID: detail.id, photos: detail.photos)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(detail.title)
                        .font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    if let description = detail.version.description {
                        Text(description).foregroundStyle(.secondary)
                    }
                }

                metaRow(detail)

                HStack(spacing: 12) {
                    RatingStars(value: detail.currentRating?.value,
                                onSelect: model.isReadOnly ? nil : { model.rate($0) },
                                onClear: model.isReadOnly ? nil : { model.clearRating() })
                        .onLongPressGesture { environment.router.present(.ratingHistory(detail.id)) }
                        .accessibilityAction(named: "Rating history") { environment.router.present(.ratingHistory(detail.id)) }
                    Text("v\(detail.version.version) · \(detail.version.createdAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.quaternary, in: Capsule())
                        .accessibilityLabel("Version \(detail.version.version), \(detail.version.createdAt.formatted(date: .long, time: .omitted))")
                }

                if !detail.tags.isEmpty { TagChips(names: detail.tags) }
                if let folderName = model.folderName {
                    Label(folderName, systemImage: "folder").font(.subheadline).foregroundStyle(.secondary)
                }

                Section {
                    section("Ingredients") {
                        ForEach(model.displayedIngredients) { ingredient in
                            ingredientRow(ingredient)
                        }
                    }
                    .padding(.top, 8)

                    section("Steps") {
                        ForEach(detail.version.instructions) { step in
                            stepRow(step)
                        }
                    }

                    if let url = detail.version.sourceURL {
                        Link(destination: url) { Label(url.host ?? url.absoluteString, systemImage: "link") }
                            .font(.subheadline)
                    }

                    if !model.isPastVersion {
                        notesSection(detail)
                    }

                    if model.hasLineage, let heritage = model.heritage {
                        section("Lineage") {
                            if let parent = heritage.parent {
                                NavigationLink(value: Route.recipe(parent.id)) {
                                    Label("Variation of \(parent.title)", systemImage: "arrow.turn.up.left")
                                }
                            }
                            if !heritage.children.isEmpty {
                                NavigationLink(value: Route.lineage(detail.id)) {
                                    Label("\(heritage.children.count) variation\(heritage.children.count == 1 ? "" : "s")", systemImage: "arrow.triangle.branch")
                                }
                            }
                            NavigationLink(value: Route.lineage(detail.id)) {
                                Text("Full lineage").font(.subheadline)
                            }
                        }
                    }

                    Text("Added \(detail.recipe.createdAt.formatted(date: .abbreviated, time: .omitted)) · Updated \(detail.recipe.updatedAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                } header: {
                    controlsBar
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .alert("Servings", isPresented: $model.isServingsEntryPresented) {
            TextField("Servings", text: $model.servingsEntryText).numberKeyboard()
            Button("Scale") { model.commitServingsEntry() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Scale the ingredients to this many servings.")
        }
    }

    /// Servings stepper + factor + reset, and the unit control. Pinned above
    /// the ingredients; display state only (Requirements 8.1–8.5, 9.3, 9.4).
    private var controlsBar: some View {
        VStack(alignment: .leading, spacing: 10) {
            if model.canScale, let servings = model.servings {
                HStack(spacing: 12) {
                    Stepper(value: Binding(get: { servings }, set: { model.setServings($0) }), in: 1...999) {
                        Text("\(servings) \(servings == 1 ? "serving" : "servings")")
                            .font(.headline)
                            .contentShape(Rectangle())
                            .onLongPressGesture { model.beginServingsEntry() }
                            .accessibilityHint("Long-press to type a number")
                    }
                    if model.isScaled {
                        Text(model.scaleFactorText)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .accessibilityLabel("Scale factor \(model.scaleFactorText)")
                        Button("Reset") { model.resetServings() }
                            .font(.subheadline)
                            .accessibilityIdentifier("resetServings")
                    }
                }
            } else {
                Label("Add a servings count to scale this recipe.", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Picker("Units", selection: $model.unitPreference) {
                Text("As written").tag(UnitPreference.original)
                Text("US").tag(UnitPreference.us)
                Text("Metric").tag(UnitPreference.metric)
            }
            .pickerStyle(.segmented)
            .accessibilityIdentifier("unitPicker")
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(.bar, in: RoundedRectangle(cornerRadius: 12))
    }

    /// Pinned then newest, up to three, with the journal behind it (7.2).
    private func notesSection(_ detail: RecipeDetail) -> some View {
        section("Notes") {
            if detail.notes.isEmpty {
                Text("No notes yet.").foregroundStyle(.secondary)
            }
            ForEach(detail.notes.prefix(3)) { note in
                NoteRow(note: note)
            }
            HStack {
                if !model.isReadOnly {
                    Button { environment.router.present(.noteEditor(recipeID: detail.id, noteID: nil)) } label: {
                        Label("Add Note", systemImage: "square.and.pencil")
                    }
                    .accessibilityIdentifier("addNoteDetail")
                }
                Spacer()
                if !detail.notes.isEmpty {
                    NavigationLink(value: Route.notes(detail.id)) { Text("All notes (\(detail.notes.count))").font(.subheadline) }
                }
            }
        }
    }

    private func metaRow(_ detail: RecipeDetail) -> some View {
        FlowLayout(spacing: 8) {
            if let prep = detail.version.prepMinutes { chip("Prep \(DurationText.minutes(prep))", "timer") }
            if let cook = detail.version.cookMinutes { chip("Cook \(DurationText.minutes(cook))", "flame") }
            if let total = detail.version.totalMinutes, detail.version.prepMinutes != nil, detail.version.cookMinutes != nil {
                chip("Total \(DurationText.minutes(total))", "clock")
            }
            if let servings = detail.version.servings { chip("\(servings) servings", "person.2") }
        }
    }

    private func chip(_ text: String, _ symbol: String) -> some View {
        Label(text, systemImage: symbol)
            .font(.subheadline)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.quaternary, in: Capsule())
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.title2.bold()).accessibilityAddTraits(.isHeader)
            content()
        }
    }

    private func ingredientRow(_ ingredient: Ingredient) -> some View {
        let isChecked = model.checked.contains(ingredient.id)
        let amount = QuantityFormatter.string(quantity: ingredient.quantity, unit: ingredient.unit)
        return Button {
            model.toggle(ingredient)
        } label: {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isChecked ? Color.accentColor : Color.secondary)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        if let amount { Text(amount).fontWeight(.semibold) }
                        Text(ingredient.name)
                    }
                    .strikethrough(isChecked)
                    .foregroundStyle(isChecked ? .secondary : .primary)
                    if let notes = ingredient.notes {
                        Text(notes).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel([amount, ingredient.name, ingredient.notes].compactMap { $0 }.joined(separator: " "))
        .accessibilityValue(isChecked ? "Checked" : "Unchecked")
        .accessibilityHint("Double-tap to toggle")
    }

    private func stepRow(_ step: Instruction) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text("\(step.step)")
                .font(.headline.monospacedDigit())
                .frame(width: 28, height: 28)
                .background(.quaternary, in: Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text(step.text)
                HStack(spacing: 8) {
                    if let minutes = step.durationMinutes {
                        Label(DurationText.minutes(minutes), systemImage: "clock")
                    }
                    if let notes = step.notes { Text(notes) }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Step \(step.step). \(step.text)\(step.durationMinutes.map { ". \(DurationText.minutes($0))" } ?? "")")
    }
}

/// The restore confirmation for a past version (2.5).
private struct RestoreDialog: ViewModifier {
    let model: RecipeDetailViewModel
    let environment: AppEnvironment
    @Binding var isPresented: Bool

    func body(content: Content) -> some View {
        content.confirmationDialog("Restore version \(model.versionNumber ?? 0)?", isPresented: $isPresented, titleVisibility: .visible) {
            Button("Restore as New Version") {
                if model.restoreThisVersion() {
                    environment.router.popToRoot()
                    environment.router.showRecipe(model.recipeID)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("A new version with this content is added. Nothing is deleted.")
        }
    }
}

/// Edit plus the overflow actions of an editable recipe (10.3). Secondary
/// items collapse into the system "More" menu on iOS 26.
private struct EditableToolbar: ToolbarContent {
    let model: RecipeDetailViewModel
    let environment: AppEnvironment
    let recipeID: Recipe.ID

    var body: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button("Edit") { environment.router.present(.editRecipe(recipeID)) }
                .accessibilityIdentifier("editButton")
        }
        ToolbarItemGroup(placement: .secondaryAction) {
            DetailActions(model: model, environment: environment, recipeID: recipeID)
        }
    }
}

private struct DetailActions: View {
    let model: RecipeDetailViewModel
    let environment: AppEnvironment
    let recipeID: Recipe.ID

    var body: some View {
        Button {
            if let copy = model.duplicate() { environment.router.showRecipe(copy) }
        } label: { Label("Duplicate", systemImage: "plus.square.on.square") }
        Button { environment.router.present(.moveToFolder(recipeID)) } label: { Label("Move to Folder…", systemImage: "folder") }
        Button { environment.router.present(.tagPicker(recipeID)) } label: { Label("Tags…", systemImage: "tag") }
        NavigationLink(value: Route.photos(recipeID)) { Label("Photos", systemImage: "photo.on.rectangle") }
        NavigationLink(value: Route.history(recipeID)) { Label("Version History", systemImage: "clock.arrow.circlepath") }
        Button { model.archive() } label: { Label("Archive", systemImage: "archivebox") }
            .accessibilityIdentifier("archiveButton")
    }
}
