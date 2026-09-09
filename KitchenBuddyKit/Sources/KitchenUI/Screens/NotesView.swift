import KitchenCore
import KitchenPersistence
import SwiftUI

/// The notes journal for a recipe: pinned first then newest first; swipe to
/// pin, edit, or delete (soft, with Undo).
///
/// Requirements: kitchen-buddy-ios 7.2–7.5
public struct NotesView: View {
    @State private var model: NotesViewModel
    private let environment: AppEnvironment

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        _model = State(initialValue: NotesViewModel(environment: environment, recipeID: recipeID))
    }

    public var body: some View {
        List {
            ForEach(model.notes) { note in
                NoteRow(note: note)
                    .contentShape(Rectangle())
                    .onTapGesture { environment.router.present(.noteEditor(recipeID: model.recipeID, noteID: note.id)) }
                    .swipeActions(edge: .leading) {
                        Button { model.setPinned(note, !note.pinned) } label: {
                            Label(note.pinned ? "Unpin" : "Pin", systemImage: note.pinned ? "pin.slash" : "pin")
                        }
                        .tint(.orange)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { model.delete(note) } label: { Label("Delete", systemImage: "trash") }
                        Button { environment.router.present(.noteEditor(recipeID: model.recipeID, noteID: note.id)) } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                    }
            }
        }
        .insetGroupedList()
        .overlay {
            if model.notes.isEmpty {
                ContentUnavailableView("No notes yet", systemImage: "note.text",
                                       description: Text("Keep a journal: what you changed, how it went."))
            }
        }
        .safeAreaInset(edge: .bottom) {
            if let deleted = model.undoableDeletion {
                HStack {
                    Text("Note deleted").font(.subheadline)
                    Spacer()
                    Button("Undo") { model.undoDelete() }.accessibilityIdentifier("undoDelete")
                }
                .padding(12)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                .padding()
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Note deleted: \(deleted.body.prefix(40)). Undo available.")
            }
        }
        .navigationTitle("Notes")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { environment.router.present(.noteEditor(recipeID: model.recipeID, noteID: nil)) } label: {
                    Label("Add Note", systemImage: "square.and.pencil")
                }
                .accessibilityIdentifier("addNote")
            }
        }
        .task { model.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
        .alert("Notes", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }
}

struct NoteRow: View {
    let note: RecipeNote

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                if note.pinned { Image(systemName: "pin.fill").foregroundStyle(.orange).font(.caption) }
                Text(note.cookedOn.map { "Cooked \($0.formatted(date: .abbreviated, time: .omitted))" }
                     ?? note.createdAt.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("v\(note.versionAtCreation)").font(.caption).foregroundStyle(.secondary)
            }
            Text(note.body)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

/// The note editor sheet.
public struct NoteEditorView: View {
    @State private var model: NoteEditorViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var hasCookedOn: Bool

    public init(environment: AppEnvironment, recipeID: Recipe.ID, noteID: RecipeNote.ID?) {
        let model = NoteEditorViewModel(environment: environment, recipeID: recipeID, noteID: noteID)
        _model = State(initialValue: model)
        _hasCookedOn = State(initialValue: model.cookedOn != nil)
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What did you change? How did it go?", text: $model.body, axis: .vertical)
                        .lineLimit(4...12)
                        .accessibilityIdentifier("noteBody")
                }
                Section {
                    Toggle("Cooked on a date", isOn: $hasCookedOn)
                    if hasCookedOn {
                        DatePicker("Cooked on", selection: Binding(get: { model.cookedOn ?? Date() }, set: { model.cookedOn = $0 }),
                                   displayedComponents: .date)
                    }
                }
            }
            .onChange(of: hasCookedOn) { model.cookedOn = hasCookedOn ? (model.cookedOn ?? Date()) : nil }
            .navigationTitle(model.isNew ? "New Note" : "Edit Note")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { if model.save() { dismiss() } }
                        .disabled(!model.canSave)
                        .accessibilityIdentifier("saveNote")
                }
            }
            .alert("Note", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(model.error ?? "") }
        }
    }
}
