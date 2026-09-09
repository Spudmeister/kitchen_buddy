import KitchenCore
import SwiftUI

/// Sheet from the servings chip: stepper, note, "Use the recipe's count",
/// and the history of reports.
///
/// Requirements: kitchen-buddy-ios 20.1–20.4
public struct ServingsReportView: View {
    @State private var model: ServingsReportViewModel
    @Environment(\.dismiss) private var dismiss

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        _model = State(initialValue: ServingsReportViewModel(environment: environment, recipeID: recipeID))
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    Stepper(value: $model.servings, in: 1...999) {
                        Text("\(model.servings) \(model.servings == 1 ? "serving" : "servings")")
                            .font(.headline)
                            .accessibilityIdentifier("servingsYouGet")
                    }
                    TextField("Note (optional) — “big eaters”, “side dish”", text: $model.note, axis: .vertical)
                        .accessibilityIdentifier("servingsNote")
                } header: {
                    Text("Servings you get")
                } footer: {
                    Text(footer)
                }
                if model.isOverridden {
                    Section {
                        Button("Use the recipe's count\(model.recipeServings.map { " (\($0))" } ?? "")") {
                            if model.useRecipeCount() { dismiss() }
                        }
                        .accessibilityIdentifier("useRecipeCount")
                    }
                }
                if !model.history.isEmpty {
                    Section("History") {
                        ForEach(model.history) { report in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(report.servings.map { "\($0) servings" } ?? "Back to the recipe's count")
                                if let note = report.note { Text(note).font(.subheadline).foregroundStyle(.secondary) }
                                Text(report.reportedAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption).foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Servings")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { if model.save() { dismiss() } }
                        .disabled(!model.canSave)
                        .accessibilityIdentifier("saveServings")
                }
            }
            .task { model.load() }
            .alert("Servings", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(model.error ?? "") }
        }
    }

    private var footer: String {
        let own = model.recipeServings.map { "The recipe says \($0)." } ?? "The recipe doesn't say how many it serves."
        return own + " Your count becomes the base for scaling and for every per-serving health figure; the recipe itself is not changed, and reports are kept as history."
    }
}
