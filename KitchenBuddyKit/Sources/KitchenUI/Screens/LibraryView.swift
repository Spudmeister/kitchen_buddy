import KitchenCore
import KitchenPersistence
import SwiftUI

/// The Library: every non-archived recipe, searchable with tokens, sorted,
/// optionally sectioned by top-level folder, with swipe and context actions
/// and two empty states.
///
/// Requirements: kitchen-buddy-ios 3.2, 6.1–6.4, 6.6
public struct LibraryView: View {
    @State private var model: LibraryViewModel
    private let environment: AppEnvironment

    public init(environment: AppEnvironment) {
        self.environment = environment
        _model = State(initialValue: LibraryViewModel(environment: environment))
    }

    public var body: some View {
        LibraryListView(model: model)
            .onAppear {
                if let text = environment.initialSearchText {
                    model.searchText = text
                    environment.initialSearchText = nil
                }
            }
            .navigationTitle("Recipes")
            .searchable(text: $model.searchText, tokens: $model.tokens,
                        suggestedTokens: Binding(get: { model.suggestedTokens }, set: { _ in }),
                        prompt: "Search recipes") { token in
                Label(token.label, systemImage: token.systemImage)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button { environment.router.present(.newRecipe(folderID: nil)) } label: {
                            Label("New Recipe", systemImage: "doc.badge.plus")
                        }
                        .accessibilityIdentifier("newRecipeMenuItem")
                        Button { environment.router.present(.newFolder(parentID: nil)) } label: {
                            Label("New Folder", systemImage: "folder.badge.plus")
                        }
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                    .accessibilityIdentifier("addMenu")
                }
                ToolbarItem(placement: .secondaryAction) {
                    SortMenu(sort: $model.sort, direction: $model.direction)
                }
                ToolbarItem(placement: .secondaryAction) {
                    NavigationLink(value: Route.folders) { Label("Folders", systemImage: "folder") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    NavigationLink(value: Route.archived) { Label("Archived", systemImage: "archivebox") }
                }
                ToolbarItem(placement: .secondaryAction) {
                    NavigationLink(value: Route.settings) { Label("Settings", systemImage: "gearshape") }
                        .accessibilityIdentifier("settingsButton")
                }
            }
    }
}

/// The list itself, shared by the Library and the folder screen.
struct LibraryListView: View {
    @Bindable var model: LibraryViewModel
    @Environment(\.dismissSearch) private var dismissSearch

    var body: some View {
        List {
            ForEach(model.sections) { section in
                Section {
                    ForEach(section.recipes) { recipe in
                        NavigationLink(value: Route.recipe(recipe.id)) {
                            RecipeRow(recipe: recipe, thumbnailURL: recipe.thumbnailPhotoID.map { model.environment.book.photos.thumbnailURL(forPhotoID: $0) })
                        }
                        .swipeActions(edge: .trailing) {
                            if recipe.isArchived {
                                Button { model.unarchive(recipe.id) } label: { Label("Unarchive", systemImage: "tray.and.arrow.up") }
                                    .tint(.green)
                            } else {
                                Button { model.archive(recipe.id) } label: { Label("Archive", systemImage: "archivebox") }
                                    .tint(.orange)
                            }
                        }
                        .swipeActions(edge: .leading) {
                            Button { model.environment.router.present(.moveToFolder(recipe.id)) } label: {
                                Label("Move", systemImage: "folder")
                            }
                            .tint(.blue)
                        }
                        .contextMenu {
                            Button { model.environment.router.present(.editRecipe(recipe.id)) } label: { Label("Edit", systemImage: "pencil") }
                            Button {
                                if let copy = model.duplicate(recipe.id) { model.environment.router.showRecipe(copy) }
                            } label: { Label("Duplicate", systemImage: "plus.square.on.square") }
                            Button { model.environment.router.present(.moveToFolder(recipe.id)) } label: { Label("Move to Folder…", systemImage: "folder") }
                            Button { model.environment.router.present(.tagPicker(recipe.id)) } label: { Label("Tags…", systemImage: "tag") }
                            if recipe.isArchived {
                                Button { model.unarchive(recipe.id) } label: { Label("Unarchive", systemImage: "tray.and.arrow.up") }
                            } else {
                                Button { model.archive(recipe.id) } label: { Label("Archive", systemImage: "archivebox") }
                            }
                        }
                    }
                } header: {
                    if let title = section.title {
                        if let folderID = section.folderID {
                            NavigationLink(value: Route.folder(folderID)) {
                                HStack { Text(title); Spacer(); Image(systemName: "chevron.right").font(.caption) }
                            }
                        } else {
                            Text(title)
                        }
                    }
                } footer: {
                    if section.id == model.sections.last?.id, model.hasLoaded, !model.results.isEmpty {
                        Text("\(model.results.count) \(model.results.count == 1 ? "recipe" : "recipes")")
                            .frame(maxWidth: .infinity)
                            .accessibilityIdentifier("recipeCount")
                    }
                }
            }
        }
        .insetGroupedList()
        .overlay {
            switch model.emptyState {
            case .noRecipes:
                ContentUnavailableView {
                    Label("No recipes yet", systemImage: "book.closed")
                } description: {
                    Text("Add your first recipe, or load the samples from Settings.")
                } actions: {
                    Button("New Recipe") { model.environment.router.present(.newRecipe(folderID: model.scopeFolderID)) }
                        .buttonStyle(.borderedProminent)
                }
            case .noMatches:
                ContentUnavailableView {
                    Label("No matches", systemImage: "magnifyingglass")
                } description: {
                    Text("Nothing matches this search and these filters.")
                } actions: {
                    Button("Clear Filters") {
                        model.clearFilters()
                        dismissSearch()
                    }
                    .buttonStyle(.bordered)
                }
            case nil:
                EmptyView()
            }
        }
        .onAppear { model.start() }
        .onDisappear { model.stop() }
        .onChange(of: model.searchText) { model.start() }
        .onChange(of: model.tokens) { model.start() }
        .onChange(of: model.sort) { model.start() }
        .onChange(of: model.direction) { model.start() }
        .onChange(of: model.environment.router.presented) { if $0 != nil && $1 == nil { model.refreshSideData() } }
        .alert("Library", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.error ?? "")
        }
    }
}

struct SortMenu: View {
    @Binding var sort: RecipeQuery.Sort
    @Binding var direction: RecipeQuery.Direction

    var body: some View {
        Menu {
            Picker("Sort by", selection: $sort) {
                Text("Name").tag(RecipeQuery.Sort.name)
                Text("Rating").tag(RecipeQuery.Sort.rating)
                Text("Date added").tag(RecipeQuery.Sort.dateAdded)
                Text("Date updated").tag(RecipeQuery.Sort.dateUpdated)
                Text("Total time").tag(RecipeQuery.Sort.totalTime)
            }
            Picker("Order", selection: $direction) {
                Text("Ascending").tag(RecipeQuery.Direction.ascending)
                Text("Descending").tag(RecipeQuery.Direction.descending)
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
        }
    }
}
