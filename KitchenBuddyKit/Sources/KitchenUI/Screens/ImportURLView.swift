import KitchenCore
import KitchenPersistence
import SwiftUI

/// Import from URL: field + Paste, progress, success → editor in review
/// mode, failure → explanation + Enter Manually.
///
/// Requirements: kitchen-buddy-ios 12.3, 12.4
public struct ImportURLView: View {
    @State private var model: ImportURLViewModel
    private let environment: AppEnvironment
    @Environment(\.dismiss) private var dismiss
    @State private var review: RecipeEditorViewModel?
    @State private var autoStart: Bool

    public init(environment: AppEnvironment, prefill: URL? = nil) {
        self.environment = environment
        _model = State(initialValue: ImportURLViewModel(environment: environment, prefill: prefill))
        _autoStart = State(initialValue: prefill != nil)
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        TextField("https://…", text: $model.urlText)
                            .urlKeyboard()
                            .autocorrectionDisabled()
                            .onSubmit { Task { await model.importRecipe() } }
                            .accessibilityIdentifier("importURLField")
                        PasteButton(payloadType: String.self) { strings in
                            if let first = strings.first { model.urlText = first }
                        }
                        .labelStyle(.iconOnly)
                        .buttonBorderShape(.capsule)
                    }
                } footer: {
                    Text("Reads the recipe data sites publish for search engines. No account, no AI.")
                }

                if case .failed(let message) = model.phase {
                    Section {
                        Label(message, systemImage: "exclamationmark.triangle").foregroundStyle(.secondary)
                        Button("Enter Manually") {
                            review = RecipeEditorViewModel(environment: environment, draft: model.manualDraft, reviewSource: nil)
                        }
                        .accessibilityIdentifier("enterManually")
                    }
                }
            }
            .navigationTitle("Import from URL")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Import") { Task { await model.importRecipe() } }
                        .disabled(!model.canImport)
                        .accessibilityIdentifier("importButton")
                }
            }
            .overlay {
                if model.phase == .loading {
                    ProgressView("Fetching…").padding(20).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
            .onChange(of: model.result?.draft) {
                if let result = model.result {
                    review = RecipeEditorViewModel(environment: environment, draft: result.draft, reviewSource: model.sourceURL)
                }
            }
            .task { if autoStart { autoStart = false; await model.importRecipe() } }
            .sheet(item: $review) { editor in
                RecipeEditorView(environment: environment, model: editor) { id in
                    dismiss()
                    environment.router.showRecipe(id)
                }
            }
        }
    }
}
