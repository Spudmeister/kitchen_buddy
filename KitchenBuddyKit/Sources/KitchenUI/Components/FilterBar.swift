import KitchenCore
import SwiftUI

/// The Library's front-page filters: a scrolling row of chips (filter
/// sheet, sort, time limits, rating, top tags) that toggle the same tokens
/// the search field uses. "Dinner recipes under 45 minutes" is two taps.
///
/// Requirements: kitchen-buddy-ios 6.2, 6.3
struct FilterBar: View {
    @Bindable var model: LibraryViewModel
    @Binding var isSheetPresented: Bool

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    isSheetPresented = true
                } label: {
                    Label(model.activeFilterCount == 0 ? "Filters" : "Filters · \(model.activeFilterCount)", systemImage: "line.3.horizontal.decrease.circle")
                }
                .buttonStyle(ChipStyle(selected: model.activeFilterCount > 0))
                .accessibilityIdentifier("filtersChip")

                if model.activeFilterCount > 0 {
                    Button("Clear") { model.tokens = [] }
                        .buttonStyle(ChipStyle(selected: false))
                        .accessibilityIdentifier("clearFiltersChip")
                }

                ForEach([30, 45, 60], id: \.self) { minutes in
                    chip(.maximumMinutes(minutes), label: "Under \(minutes) min", identifier: "chip-time-\(minutes)")
                }
                chip(.minimumRating(4), label: "4+ stars", identifier: "chip-rating-4")
                ForEach(model.healthChips) { token in
                    chip(token, label: token.label, identifier: "chip-\(token.id)")
                }
                ForEach(model.tagChips.prefix(8)) { token in
                    chip(token, label: token.label, identifier: "chip-tag-\(token.label)")
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
        .accessibilityLabel("Filters")
    }

    private func chip(_ token: SearchToken, label: String, identifier: String) -> some View {
        let active = model.isActive(token)
        return Button { model.toggle(token) } label: {
            Label(label, systemImage: token.systemImage).labelStyle(.titleOnly)
        }
        .buttonStyle(ChipStyle(selected: active))
        .accessibilityAddTraits(active ? .isSelected : [])
        .accessibilityIdentifier(identifier)
    }
}

struct ChipStyle: ButtonStyle {
    let selected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(selected ? .semibold : .regular))
            .padding(.horizontal, 12)
            .frame(minHeight: 34)
            .background(selected ? Color.accentColor : Color.secondary.opacity(0.14), in: Capsule())
            .foregroundStyle(selected ? Color.white : Color.primary)
            .opacity(configuration.isPressed ? 0.7 : 1)
            .contentShape(Capsule())
    }
}

/// The full controls behind the "Filters" chip: total-time slider, minimum
/// rating, every tag, sort and direction.
struct FilterSheet: View {
    @Bindable var model: LibraryViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var limitTime: Bool
    @State private var minutes: Double

    init(model: LibraryViewModel) {
        self.model = model
        _limitTime = State(initialValue: model.maximumMinutes != nil)
        _minutes = State(initialValue: Double(model.maximumMinutes ?? 45))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Total time") {
                    Toggle("Limit total time", isOn: $limitTime)
                        .onChange(of: limitTime) { model.setMaximumMinutes(limitTime ? Int(minutes) : nil) }
                    if limitTime {
                        Slider(value: $minutes, in: 10...240, step: 5) {
                            Text("Under")
                        } minimumValueLabel: { Text("10m") } maximumValueLabel: { Text("4h") }
                        .onChange(of: minutes) { model.setMaximumMinutes(Int(minutes)) }
                        .accessibilityValue("Under \(DurationText.minutes(Int(minutes)))")
                        Text("Under \(DurationText.minutes(Int(minutes)))").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Section("Minimum rating") {
                    HStack {
                        RatingStars(value: model.minimumRating,
                                    onSelect: { model.setMinimumRating(model.minimumRating == $0 ? nil : $0) },
                                    onClear: { model.setMinimumRating(nil) })
                        Spacer()
                        Text(model.minimumRating.map { "\($0)+ stars" } ?? "Any").foregroundStyle(.secondary)
                    }
                }
                if !model.healthChips.isEmpty {
                    Section {
                        ForEach(model.healthChips) { token in
                            Toggle(isOn: Binding(get: { model.isActive(token) }, set: { _ in model.toggle(token) })) {
                                Label(token.label, systemImage: token.systemImage)
                            }
                            .accessibilityIdentifier("filter-\(token.id)")
                        }
                    } header: {
                        Text("Health")
                    } footer: {
                        Text("Only recipes whose per-serving estimate is in the low band. Estimates from typical ingredients, not medical advice.")
                    }
                }
                Section("Tags") {
                    if model.tagChips.isEmpty { Text("No tags yet.").foregroundStyle(.secondary) }
                    ForEach(model.tagChips) { token in
                        Toggle(token.label, isOn: Binding(get: { model.isActive(token) }, set: { _ in model.toggle(token) }))
                    }
                }
                Section("Sort") {
                    Picker("Sort by", selection: $model.sort) {
                        Text("Name").tag(RecipeQuery.Sort.name)
                        Text("Rating").tag(RecipeQuery.Sort.rating)
                        Text("Date added").tag(RecipeQuery.Sort.dateAdded)
                        Text("Date updated").tag(RecipeQuery.Sort.dateUpdated)
                        Text("Total time").tag(RecipeQuery.Sort.totalTime)
                    }
                    Picker("Order", selection: $model.direction) {
                        Text("Ascending").tag(RecipeQuery.Direction.ascending)
                        Text("Descending").tag(RecipeQuery.Direction.descending)
                    }
                    .pickerStyle(.segmented)
                }
                Section {
                    Toggle("Include archived recipes", isOn: Binding(get: { model.isActive(.includeArchived) }, set: { _ in model.toggle(.includeArchived) }))
                }
                if model.activeFilterCount > 0 {
                    Section { Button("Clear All Filters", role: .destructive) { model.tokens = []; limitTime = false } }
                }
            }
            .navigationTitle("Filters")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.accessibilityIdentifier("filtersDone") } }
        }
    }
}
