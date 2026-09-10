import KitchenCore
import SwiftUI

/// One folder: subfolders with counts, then the recipes in it and its
/// subfolders; rename/move/delete from the toolbar; multi-select move.
///
/// Requirements: kitchen-buddy-ios 16.3–16.6
public struct FolderView: View {
    private let environment: AppEnvironment
    private let folderID: Folder.ID
    @State private var model: LibraryViewModel
    @State private var browser: FolderBrowserViewModel
    @State private var confirmDelete = false
    @State private var isSelecting = false
    @State private var selected: Set<Recipe.ID> = []

    public init(environment: AppEnvironment, folderID: Folder.ID) {
        self.environment = environment
        self.folderID = folderID
        _model = State(initialValue: LibraryViewModel(environment: environment, scopeFolderID: folderID))
        _browser = State(initialValue: FolderBrowserViewModel(environment: environment))
    }

    private var folder: Folder? { browser.folder(folderID) }
    private var children: [Folder] { browser.children(of: folderID) }

    public var body: some View {
        Group {
            if isSelecting {
                selectionList
            } else {
                VStack(spacing: 0) {
                    if !children.isEmpty {
                        List {
                            Section("Folders") {
                                ForEach(children) { child in
                                    FolderRow(folder: child, count: browser.count(of: child.id), model: browser)
                                }
                            }
                        }
                        .insetGroupedList()
                        .frame(maxHeight: CGFloat(children.count) * 52 + 60)
                    }
                    LibraryListView(model: model)
                }
            }
        }
        .navigationTitle(folder?.name ?? "Folder")
        .searchable(text: $model.searchText, prompt: "Search this folder")
        .toolbar {
            if isSelecting {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { isSelecting = false; selected = [] } }
                ToolbarItem(placement: .primaryAction) {
                    Button("Move \(selected.count)") { environment.router.present(.moveRecipes(Array(selected))); isSelecting = false }
                        .disabled(selected.isEmpty)
                        .accessibilityIdentifier("moveSelected")
                }
            } else {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { environment.router.present(.newRecipe(folderID: folderID)) } label: { Label("New Recipe Here", systemImage: "doc.badge.plus") }
                        Button { environment.router.present(.newFolder(parentID: folderID)) } label: { Label("New Subfolder", systemImage: "folder.badge.plus") }
                    } label: { Label("Add", systemImage: "plus") }
                }
                ToolbarItem(placement: .secondaryAction) { SortMenu(sort: $model.sort, direction: $model.direction) }
                ToolbarItem(placement: .secondaryAction) {
                    Button { isSelecting = true } label: { Label("Select Recipes", systemImage: "checkmark.circle") }
                        .disabled(model.results.isEmpty)
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button { environment.router.present(.renameFolder(folderID)) } label: { Label("Rename Folder", systemImage: "pencil") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button { environment.router.present(.moveFolder(folderID)) } label: { Label("Move Folder…", systemImage: "folder") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button(role: .destructive) { confirmDelete = true } label: { Label("Delete Folder", systemImage: "trash") }
                }
            }
        }
        .confirmationDialog("Delete “\(folder?.name ?? "")”?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete Folder", role: .destructive) {
                browser.delete(folderID)
                environment.router.pop()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Its recipes and subfolders move up a level. Nothing is deleted.")
        }
        .task { browser.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { browser.load(); model.refreshSideData() } }
        .alert("Folder", isPresented: Binding(get: { browser.error != nil }, set: { if !$0 { browser.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(browser.error ?? "") }
    }

    private var selectionList: some View {
        List(model.results, selection: $selected) { recipe in
            RecipeRow(recipe: recipe, healthProfiles: model.environment.preferences.healthProfiles).tag(recipe.id)
        }
        .insetGroupedList()
        .reorderMode(active: true)
    }
}
