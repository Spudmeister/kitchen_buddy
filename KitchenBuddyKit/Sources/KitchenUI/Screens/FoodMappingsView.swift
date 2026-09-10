import KitchenCore
import SwiftUI

/// The list behind Settings › Health › Your food mappings.
///
/// Requirements: kitchen-buddy-ios 21.11
public struct FoodMappingsView: View {
    @State private var model: FoodMappingsViewModel

    public init(environment: AppEnvironment) {
        _model = State(initialValue: FoodMappingsViewModel(environment: environment))
    }

    public var body: some View {
        List {
            if model.entries.isEmpty {
                Section {
                    Text("No mappings yet. On a recipe's health worksheet, tap an ingredient line to choose the food it should count as; the choice applies to every recipe that uses that ingredient name.")
                        .foregroundStyle(.secondary)
                }
            } else {
                Section {
                    ForEach(model.entries) { entry in
                        VStack(alignment: .leading, spacing: 3) {
                            Text("“\(entry.ingredientKey)”").fontWeight(.medium)
                            Text(entry.food.map { "→ \($0.name)" } ?? "→ Not counted")
                                .font(.subheadline)
                            if let automatic = entry.automaticMatch {
                                Text("Automatic would be \(automatic.name)").font(.caption).foregroundStyle(.secondary)
                            } else {
                                Text("Automatic finds nothing").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        .swipeActions {
                            Button("Back to automatic") { model.resetToAutomatic(entry) }.tint(.orange)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityAction(named: "Back to automatic") { model.resetToAutomatic(entry) }
                    }
                } footer: {
                    Text("Swipe a row to go back to automatic matching. Mappings are kept as history and travel in backups.")
                }
            }
        }
        .insetGroupedList()
        .navigationTitle("Your food mappings")
        .inlineTitle()
        .task { model.load() }
        .alert("Food mappings", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }
}
