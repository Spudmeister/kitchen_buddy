import KitchenCore
import KitchenPersistence
import SwiftUI

/// Lineage: ancestors (root first), this recipe, and the recipes duplicated
/// from it (archived ones marked).
///
/// Requirements: kitchen-buddy-ios 4.3, 4.4
public struct LineageView: View {
    private let environment: AppEnvironment
    private let recipeID: Recipe.ID
    @State private var heritage: RecipeHeritage?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        self.recipeID = recipeID
    }

    public var body: some View {
        List {
            if let heritage {
                if !heritage.ancestors.isEmpty {
                    Section("Ancestors") {
                        ForEach(Array(heritage.ancestors.reversed().enumerated()), id: \.element.id) { index, ancestor in
                            NavigationLink(value: Route.recipe(ancestor.id)) {
                                RecipeRow(recipe: ancestor).padding(.leading, CGFloat(index) * 12)
                            }
                        }
                    }
                }
                Section("This recipe") {
                    RecipeRow(recipe: heritage.recipe)
                }
                Section(heritage.children.isEmpty ? "Variations" : "Variations (\(heritage.children.count))") {
                    if heritage.children.isEmpty {
                        Text("Duplicate this recipe to start a variation.").foregroundStyle(.secondary)
                    }
                    ForEach(heritage.children) { child in
                        NavigationLink(value: Route.recipe(child.id)) { RecipeRow(recipe: child) }
                    }
                }
            }
        }
        .insetGroupedList()
        .navigationTitle("Lineage")
        .task { heritage = try? environment.book.recipes.heritage(recipeID) }
    }
}
