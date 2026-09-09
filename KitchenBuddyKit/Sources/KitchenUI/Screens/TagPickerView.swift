import KitchenCore
import KitchenPersistence
import SwiftUI

/// Pick tags for a recipe: existing tags with counts, checkmarks, and a
/// field that filters and adds new names.
///
/// Requirements: kitchen-buddy-ios 5.1, 5.5
public struct TagPickerView: View {
    private let environment: AppEnvironment
    @Binding private var selection: [String]
    @Environment(\.dismiss) private var dismiss
    @State private var all: [TagCount] = []
    @State private var text = ""

    public init(environment: AppEnvironment, selection: Binding<[String]>) {
        self.environment = environment
        _selection = selection
    }

    private var query: String { TagName.normalize(text) ?? "" }

    private var visible: [TagCount] {
        let key = TagName.key(query)
        return all.filter { key.isEmpty || TagName.key($0.name).hasPrefix(key) }
    }

    private var canAdd: Bool {
        !query.isEmpty && !all.contains { TagName.key($0.name) == TagName.key(query) }
    }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Add or find a tag", text: $text)
                        .noAutocapitalization()
                        .autocorrectionDisabled()
                        .onSubmit { addTyped() }
                        .accessibilityIdentifier("tagField")
                    if canAdd {
                        Button { addTyped() } label: { Label("Add “\(query)”", systemImage: "plus.circle") }
                    }
                }
                Section(all.isEmpty ? "Tags" : "\(selection.count) selected") {
                    ForEach(visible, id: \.name) { tag in
                        let isOn = selection.contains { TagName.key($0) == TagName.key(tag.name) }
                        Button { toggle(tag.name) } label: {
                            HStack {
                                Text(tag.name)
                                Spacer()
                                if tag.count > 0 { Text("\(tag.count)").foregroundStyle(.secondary) }
                                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(isOn ? Color.accentColor : Color.secondary)
                            }
                        }
                        .tint(.primary)
                        .accessibilityLabel(tag.name)
                        .accessibilityValue(isOn ? "Selected" : "Not selected")
                        .accessibilityAddTraits(isOn ? .isSelected : [])
                    }
                }
            }
            .navigationTitle("Tags")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { reload() }
        }
    }

    private func reload() {
        let stored = (try? environment.book.tags.all()) ?? []
        let storedKeys = Set(stored.map { TagName.key($0.name) })
        // Selected names not yet stored (new on this recipe) show too.
        let pending = selection.filter { !storedKeys.contains(TagName.key($0)) }.map { TagCount(name: $0, count: 0) }
        all = pending + stored
    }

    private func toggle(_ name: String) {
        if let index = selection.firstIndex(where: { TagName.key($0) == TagName.key(name) }) {
            selection.remove(at: index)
        } else {
            selection.append(name)
        }
    }

    private func addTyped() {
        guard !query.isEmpty else { return }
        if !selection.contains(where: { TagName.key($0) == TagName.key(query) }) { selection.append(query) }
        if !all.contains(where: { TagName.key($0.name) == TagName.key(query) }) {
            all.insert(TagCount(name: query, count: 0), at: 0)
        }
        text = ""
    }
}
