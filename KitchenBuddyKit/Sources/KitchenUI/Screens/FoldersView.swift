import KitchenCore
import KitchenPersistence
import SwiftUI

/// The folder browser root: top-level folders with subtree counts.
///
/// Requirements: kitchen-buddy-ios 16.3
public struct FoldersView: View {
    @State private var model: FolderBrowserViewModel
    private let environment: AppEnvironment

    public init(environment: AppEnvironment) {
        self.environment = environment
        _model = State(initialValue: FolderBrowserViewModel(environment: environment))
    }

    public var body: some View {
        List {
            ForEach(model.children(of: nil)) { folder in
                FolderRow(folder: folder, count: model.count(of: folder.id), model: model)
            }
        }
        .insetGroupedList()
        .overlay {
            if model.folders.isEmpty {
                ContentUnavailableView {
                    Label("No folders", systemImage: "folder")
                } description: {
                    Text("Folders can nest. Recipes live in one folder or none.")
                } actions: {
                    Button("New Folder") { environment.router.present(.newFolder(parentID: nil)) }.buttonStyle(.borderedProminent)
                }
            }
        }
        .navigationTitle("Folders")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { environment.router.present(.newFolder(parentID: nil)) } label: { Label("New Folder", systemImage: "folder.badge.plus") }
                    .accessibilityIdentifier("newFolder")
            }
        }
        .task { model.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
        .alert("Folders", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }
}

/// A folder row with its subtree count and the management actions.
struct FolderRow: View {
    let folder: Folder
    let count: Int
    let model: FolderBrowserViewModel
    @State private var confirmDelete = false

    var body: some View {
        NavigationLink(value: Route.folder(folder.id)) {
            HStack {
                Label(folder.name, systemImage: "folder")
                Spacer()
                Text("\(count)").foregroundStyle(.secondary).monospacedDigit()
                    .accessibilityLabel("\(count) recipes")
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
            Button { model.environment.router.present(.renameFolder(folder.id)) } label: { Label("Rename", systemImage: "pencil") }
                .tint(.blue)
        }
        .contextMenu {
            Button { model.environment.router.present(.renameFolder(folder.id)) } label: { Label("Rename", systemImage: "pencil") }
            Button { model.environment.router.present(.moveFolder(folder.id)) } label: { Label("Move to…", systemImage: "folder") }
            Button { model.environment.router.present(.newFolder(parentID: folder.id)) } label: { Label("New Subfolder", systemImage: "folder.badge.plus") }
            Divider()
            Button(role: .destructive) { confirmDelete = true } label: { Label("Delete Folder", systemImage: "trash") }
        }
        .confirmationDialog("Delete “\(folder.name)”?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete Folder", role: .destructive) { model.delete(folder.id) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Its recipes and subfolders move up a level. Nothing is deleted.")
        }
    }
}

/// Rename sheet.
struct RenameFolderView: View {
    let environment: AppEnvironment
    let folderID: Folder.ID
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form { TextField("Folder name", text: $name).onSubmit(save).accessibilityIdentifier("folderNameField") }
                .navigationTitle("Rename Folder")
                .inlineTitle()
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save", action: save).disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .task { name = (try? environment.book.folders.folder(folderID))?.name ?? "" }
                .alert("Folder", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                    Button("OK", role: .cancel) {}
                } message: { Text(error ?? "") }
        }
    }

    private func save() {
        do {
            _ = try environment.book.folders.rename(folderID, to: name)
            dismiss()
        } catch {
            self.error = "\(error)"
        }
    }
}

/// Move-folder sheet: legal targets only (the folder's own subtree is
/// excluded), and the store's cycle rejection is still surfaced if it fires.
struct MoveFolderView: View {
    let environment: AppEnvironment
    let folderID: Folder.ID
    @Environment(\.dismiss) private var dismiss
    @State private var model: FolderBrowserViewModel
    @State private var selection: Folder.ID?
    @State private var loaded = false

    init(environment: AppEnvironment, folderID: Folder.ID) {
        self.environment = environment
        self.folderID = folderID
        _model = State(initialValue: FolderBrowserViewModel(environment: environment))
    }

    var body: some View {
        NavigationStack {
            List {
                row(name: "Top level", id: nil, depth: 0, symbol: "tray")
                ForEach(model.moveTargets(for: folderID)) { node in
                    row(name: node.folder.name, id: node.folder.id, depth: node.depth, symbol: "folder")
                }
            }
            .navigationTitle("Move Folder")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Move") { if model.move(folderID, toParent: selection) { dismiss() } }
                        .accessibilityIdentifier("moveFolderConfirm")
                }
            }
            .task {
                model.load()
                selection = model.folder(folderID)?.parentID
                loaded = true
            }
            .alert("Folder", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(model.error ?? "") }
        }
    }

    private func row(name: String, id: Folder.ID?, depth: Int, symbol: String) -> some View {
        Button { selection = id } label: {
            HStack {
                Label(name, systemImage: symbol).padding(.leading, CGFloat(depth) * 20)
                Spacer()
                if selection == id { Image(systemName: "checkmark").foregroundStyle(Color.accentColor) }
            }
        }
        .tint(.primary)
    }
}

/// Multi-select move of recipes to one folder.
struct MoveRecipesView: View {
    let environment: AppEnvironment
    let recipeIDs: [Recipe.ID]
    @Environment(\.dismiss) private var dismiss
    @State private var selection: Folder.ID?

    var body: some View {
        FolderPickerView(environment: environment, selection: $selection)
            .onChange(of: selection) {
                for id in recipeIDs { try? environment.book.recipes.move(id, toFolder: selection) }
                dismiss()
            }
    }
}
