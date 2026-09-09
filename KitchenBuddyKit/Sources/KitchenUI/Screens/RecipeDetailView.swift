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

    public init(environment: AppEnvironment, recipeID: Recipe.ID, versionNumber: Int? = nil) {
        self.environment = environment
        _model = State(initialValue: RecipeDetailViewModel(environment: environment, recipeID: recipeID, versionNumber: versionNumber))
    }

    public var body: some View {
        Group {
            if let detail = model.detail {
                content(detail)
            } else if model.isMissing {
                ContentUnavailableView("Recipe not found", systemImage: "questionmark.folder")
            } else {
                ProgressView()
            }
        }
        .navigationTitle(model.isPastVersion ? "Version \(model.versionNumber ?? 0)" : "")
        .inlineTitle()
        .toolbar {
            if let detail = model.detail, !model.isReadOnly {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit") { environment.router.present(.editRecipe(detail.id)) }
                        .accessibilityIdentifier("editButton")
                }
                // Secondary items collapse into the system overflow menu.
                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        if let copy = model.duplicate() { environment.router.showRecipe(copy) }
                    } label: { Label("Duplicate", systemImage: "plus.square.on.square") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button { environment.router.present(.moveToFolder(detail.id)) } label: { Label("Move to Folder…", systemImage: "folder") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button { environment.router.present(.tagPicker(detail.id)) } label: { Label("Tags…", systemImage: "tag") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button { model.archive() } label: { Label("Archive", systemImage: "archivebox") }
                        .accessibilityIdentifier("archiveButton")
                }
            } else if model.isArchived, !model.isPastVersion {
                ToolbarItem(placement: .primaryAction) {
                    Button("Unarchive") { model.unarchive() }
                        .accessibilityIdentifier("unarchiveButton")
                }
            }
        }
        .task { model.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
        .alert("Recipe", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.error ?? "")
        }
    }

    @ViewBuilder
    private func content(_ detail: RecipeDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let archivedAt = detail.recipe.archivedAt {
                    Label("Archived \(archivedAt.formatted(date: .abbreviated, time: .omitted)). Unarchive to edit.",
                          systemImage: "archivebox")
                        .font(.subheadline)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))
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
                    RatingStars(value: detail.currentRating?.value, onSelect: model.isReadOnly ? nil : { model.rate($0) })
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

                section("Ingredients") {
                    ForEach(detail.version.ingredients) { ingredient in
                        ingredientRow(ingredient)
                    }
                }

                section("Steps") {
                    ForEach(detail.version.instructions) { step in
                        stepRow(step)
                    }
                }

                if let url = detail.version.sourceURL {
                    Link(destination: url) { Label(url.host ?? url.absoluteString, systemImage: "link") }
                        .font(.subheadline)
                }

                Text("Added \(detail.recipe.createdAt.formatted(date: .abbreviated, time: .omitted)) · Updated \(detail.recipe.updatedAt.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
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
