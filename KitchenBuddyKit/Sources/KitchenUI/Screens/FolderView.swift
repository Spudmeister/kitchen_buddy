import KitchenCore
import SwiftUI

/// One folder: its subfolders, then the recipes in it and its subfolders.
/// The full browser (rename, move, delete, multi-select) is M5.
///
/// Requirements: kitchen-buddy-ios 16.3, 16.6
public struct FolderView: View {
    private let environment: AppEnvironment
    private let folderID: Folder.ID
    @State private var model: LibraryViewModel
    @State private var folder: Folder?
    @State private var children: [Folder] = []

    public init(environment: AppEnvironment, folderID: Folder.ID) {
        self.environment = environment
        self.folderID = folderID
        _model = State(initialValue: LibraryViewModel(environment: environment, scopeFolderID: folderID))
    }

    public var body: some View {
        VStack(spacing: 0) {
            if !children.isEmpty {
                List {
                    Section("Folders") {
                        ForEach(children) { child in
                            NavigationLink(value: Route.folder(child.id)) {
                                Label(child.name, systemImage: "folder")
                            }
                        }
                    }
                }
                .insetGroupedList()
                .frame(maxHeight: CGFloat(children.count) * 52 + 60)
            }
            LibraryListView(model: model)
        }
        .navigationTitle(folder?.name ?? "Folder")
        .searchable(text: $model.searchText, prompt: "Search this folder")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button { environment.router.present(.newRecipe(folderID: folderID)) } label: {
                        Label("New Recipe Here", systemImage: "doc.badge.plus")
                    }
                    Button { environment.router.present(.newFolder(parentID: folderID)) } label: {
                        Label("New Subfolder", systemImage: "folder.badge.plus")
                    }
                } label: {
                    Label("Add", systemImage: "plus")
                }
            }
            ToolbarItem(placement: .secondaryAction) {
                SortMenu(sort: $model.sort, direction: $model.direction)
            }
        }
        .task { reload() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { reload() } }
    }

    private func reload() {
        folder = try? environment.book.folders.folder(folderID)
        children = (try? environment.book.folders.children(of: folderID)) ?? []
    }
}
