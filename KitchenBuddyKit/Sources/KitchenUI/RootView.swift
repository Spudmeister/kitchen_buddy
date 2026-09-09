import KitchenCore
import KitchenPersistence
import SwiftUI

/// The root `NavigationStack` over the Library, routed by `Router`, with
/// every sheet and the recovery notice presented here. The path is stored
/// in scene storage so a relaunch returns to the same screen.
///
/// Requirements: kitchen-buddy-ios 19.4 (state restoration)
public struct RootView: View {
    @Bindable private var environment: AppEnvironment
    @Bindable private var router: Router
    @SceneStorage("navigationPath") private var storedPath: Data?
    private let initialRoutes: [Route]

    public init(environment: AppEnvironment, initialRoutes: [Route] = []) {
        self.environment = environment
        self.router = environment.router
        self.initialRoutes = initialRoutes
    }

    public var body: some View {
        NavigationStack(path: $router.path) {
            LibraryView(environment: environment)
                .navigationDestination(for: Route.self) { route in
                    destination(route)
                }
        }
        .sheet(item: $router.presented) { sheet in
            presented(sheet)
        }
        .recoveryCover(isPresented: $environment.isRecoveryPresented) {
            RecoveryView(environment: environment)
        }
        .onAppear {
            if !initialRoutes.isEmpty {
                router.path = initialRoutes
            } else if router.path.isEmpty, let storedPath {
                router.encodedPath = storedPath
            }
        }
        .onChange(of: router.path) { storedPath = router.encodedPath }
        .onOpenURL { environment.open($0) }
    }

    @ViewBuilder
    private func destination(_ route: Route) -> some View {
        switch route {
        case .recipe(let id): RecipeDetailView(environment: environment, recipeID: id)
        case .recipeVersion(let id, let version): RecipeDetailView(environment: environment, recipeID: id, versionNumber: version)
        case .folder(let id): FolderView(environment: environment, folderID: id)
        case .folders: FoldersView(environment: environment)
        case .history(let id): VersionHistoryView(environment: environment, recipeID: id)
        case .lineage(let id): LineageView(environment: environment, recipeID: id)
        case .notes(let id): NotesView(environment: environment, recipeID: id)
        case .photos(let id): PhotoGalleryView(environment: environment, recipeID: id)
        case .archived: ArchivedView(environment: environment)
        case .settings: SettingsView(environment: environment)
        case .backups: BackupsView(environment: environment)
        }
    }

    @ViewBuilder
    private func presented(_ sheet: Router.Sheet) -> some View {
        switch sheet {
        case .newRecipe(let folderID):
            RecipeEditorView(environment: environment,
                             model: RecipeEditorViewModel(environment: environment, newIn: folderID)) { id in
                router.showRecipe(id)
            }
        case .editRecipe(let id):
            if let model = RecipeEditorViewModel.editing(id, in: environment) {
                RecipeEditorView(environment: environment, model: model)
            } else {
                ContentUnavailableView("Recipe not found", systemImage: "questionmark.folder")
            }
        case .tagPicker(let id):
            RecipeTagSheet(environment: environment, recipeID: id)
        case .moveToFolder(let id):
            RecipeFolderSheet(environment: environment, recipeID: id)
        case .newFolder(let parentID):
            NewFolderView(environment: environment, parentID: parentID)
        case .noteEditor(let recipeID, let noteID):
            NoteEditorView(environment: environment, recipeID: recipeID, noteID: noteID)
        case .ratingHistory(let id):
            RatingHistorySheet(environment: environment, recipeID: id)
        case .renameFolder(let id):
            RenameFolderView(environment: environment, folderID: id)
        case .moveFolder(let id):
            MoveFolderView(environment: environment, folderID: id)
        case .moveRecipes(let ids):
            MoveRecipesView(environment: environment, recipeIDs: ids)
        case .photoViewer(let id, let index):
            PhotoViewerView(environment: environment, recipeID: id, index: index)
        case .importURL(let url):
            ImportURLView(environment: environment, prefill: url)
        case .importFile(let url):
            ImportFileView(environment: environment, url: url)
        case .share(let scope, let backup):
            ShareView(environment: environment, scope: scope, backup: backup, pdfInput: nil)
        }
    }
}

/// Tag picker bound to a stored recipe: saves on every change.
struct RecipeTagSheet: View {
    let environment: AppEnvironment
    let recipeID: Recipe.ID
    @State private var tags: [String] = []
    @State private var loaded = false

    var body: some View {
        TagPickerView(environment: environment, selection: $tags)
            .task {
                tags = (try? environment.book.tags.tags(for: recipeID)) ?? []
                loaded = true
            }
            .onChange(of: tags) {
                guard loaded else { return }
                try? environment.book.recipes.setTags(tags, for: recipeID)
            }
    }
}

/// Folder picker bound to a stored recipe: moves on every change.
struct RecipeFolderSheet: View {
    let environment: AppEnvironment
    let recipeID: Recipe.ID
    @State private var folderID: Folder.ID?
    @State private var loaded = false

    var body: some View {
        FolderPickerView(environment: environment, selection: $folderID)
            .task {
                folderID = try? environment.book.recipes.detail(recipeID)?.recipe.folderID
                loaded = true
            }
            .onChange(of: folderID) {
                guard loaded else { return }
                try? environment.book.recipes.move(recipeID, toFolder: folderID)
            }
    }
}

private extension View {
    /// Full-screen on iOS; a non-dismissable sheet elsewhere (macOS builds
    /// exist only so the package compiles and tests headlessly).
    @ViewBuilder
    func recoveryCover<Content: View>(isPresented: Binding<Bool>, @ViewBuilder content: @escaping () -> Content) -> some View {
        #if os(iOS)
        fullScreenCover(isPresented: isPresented, content: content)
        #else
        sheet(isPresented: isPresented, content: content)
        #endif
    }
}

#Preview {
    RootView(environment: .preview())
}
