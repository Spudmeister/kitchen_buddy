import KitchenCore
import KitchenPersistence
import SwiftUI

/// Pick a folder (or Unfiled) from the tree; create one inline.
///
/// Requirements: kitchen-buddy-ios 16.1
public struct FolderPickerView: View {
    private let environment: AppEnvironment
    @Binding private var selection: Folder.ID?
    @Environment(\.dismiss) private var dismiss
    @State private var nodes: [FolderTree.Node] = []
    @State private var newName = ""
    @State private var error: String?

    public init(environment: AppEnvironment, selection: Binding<Folder.ID?>) {
        self.environment = environment
        _selection = selection
    }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    row(name: "Unfiled", id: nil, depth: 0, symbol: "tray")
                    ForEach(nodes) { node in
                        row(name: node.folder.name, id: node.folder.id, depth: node.depth, symbol: "folder")
                    }
                }
                Section("New folder") {
                    HStack {
                        TextField("Folder name", text: $newName).onSubmit { create() }
                        Button("Add") { create() }.disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .navigationTitle("Folder")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { reload() }
            .alert("Folder", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(error ?? "")
            }
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
        .accessibilityAddTraits(selection == id ? .isSelected : [])
    }

    private func reload() {
        nodes = FolderTree.flattened((try? environment.book.folders.all()) ?? [])
    }

    private func create() {
        do {
            let folder = try environment.book.folders.create(name: newName, parentID: nil)
            selection = folder.id
            newName = ""
            reload()
        } catch {
            self.error = "\(error)"
        }
    }
}

/// Standalone "New Folder" sheet from the Library `+` menu.
struct NewFolderView: View {
    let environment: AppEnvironment
    let parentID: Folder.ID?
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Folder name", text: $name).onSubmit { create() }
            }
            .navigationTitle(parentID == nil ? "New Folder" : "New Subfolder")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { create() }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .alert("Folder", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(error ?? "")
            }
        }
    }

    private func create() {
        do {
            _ = try environment.book.folders.create(name: name, parentID: parentID)
            dismiss()
        } catch {
            self.error = "\(error)"
        }
    }
}
