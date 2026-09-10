import KitchenCore
import KitchenPersistence
import SwiftUI

/// Archived recipes: view them read-only, unarchive with a swipe or from
/// the detail toolbar. Nothing here deletes.
///
/// Requirements: kitchen-buddy-ios 3.2–3.4
public struct ArchivedView: View {
    private let environment: AppEnvironment
    @State private var recipes: [RecipeSummary] = []
    @State private var loaded = false

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public var body: some View {
        List {
            ForEach(recipes) { recipe in
                NavigationLink(value: Route.recipe(recipe.id)) {
                    RecipeRow(recipe: recipe, thumbnailURL: recipe.thumbnailPhotoID.map { environment.book.photos.thumbnailURL(forPhotoID: $0) },
                              healthProfiles: environment.preferences.healthProfiles)
                }
                    .swipeActions(edge: .trailing) {
                        Button { unarchive(recipe.id) } label: { Label("Unarchive", systemImage: "tray.and.arrow.up") }
                            .tint(.green)
                    }
            }
        }
        .insetGroupedList()
        .overlay {
            if loaded, recipes.isEmpty {
                ContentUnavailableView("Nothing archived", systemImage: "archivebox",
                                       description: Text("Archived recipes are kept forever and can be brought back any time."))
            }
        }
        .navigationTitle("Archived")
        .task { reload() }
        .refreshable { reload() }
    }

    private func reload() {
        let all = (try? environment.book.recipes.summaries(RecipeQuery(includeArchived: true, sort: .dateUpdated, direction: .descending))) ?? []
        recipes = all.filter(\.isArchived)
        loaded = true
    }

    private func unarchive(_ id: Recipe.ID) {
        try? environment.book.recipes.unarchive(id)
        reload()
    }
}
