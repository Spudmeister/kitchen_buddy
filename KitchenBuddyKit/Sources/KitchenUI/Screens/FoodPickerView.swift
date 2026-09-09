import KitchenCore
import KitchenPersistence
import SwiftUI

/// Search the food table for one ingredient line; "Don't count" and
/// "Back to automatic" append overrides too.
///
/// Requirements: kitchen-buddy-ios 21.6
public struct FoodPickerView: View {
    private let environment: AppEnvironment
    private let recipeID: Recipe.ID
    private let ingredientName: String
    @State private var text = ""
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    public init(environment: AppEnvironment, recipeID: Recipe.ID, ingredientName: String) {
        self.environment = environment
        self.recipeID = recipeID
        self.ingredientName = ingredientName
    }

    private var results: [Food] { FoodTable.search(text.isEmpty ? ingredientName : text) }
    private var automatic: FoodMatch? { FoodMatcher.match(ingredientName) }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    if let automatic {
                        Button {
                            perform { try $0.recipes.clearFoodOverride(recipeID, ingredientName: ingredientName) }
                        } label: {
                            Label("Automatic: \(automatic.food.name)", systemImage: "wand.and.stars")
                        }
                        .accessibilityIdentifier("foodAutomatic")
                    }
                    Button(role: .destructive) {
                        perform { try $0.recipes.setFoodOverride(recipeID, ingredientName: ingredientName, foodID: nil) }
                    } label: {
                        Label("Don't count this ingredient", systemImage: "minus.circle")
                    }
                    .accessibilityIdentifier("foodDontCount")
                } header: {
                    Text("“\(ingredientName)”")
                }
                Section(results.isEmpty ? "No foods match" : "Foods") {
                    ForEach(results.isEmpty && !text.isEmpty ? [] : (results.isEmpty ? FoodTable.search("") : results)) { food in
                        Button {
                            perform { try $0.recipes.setFoodOverride(recipeID, ingredientName: ingredientName, foodID: food.id) }
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(food.name)
                                Text(detailLine(food)).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        .accessibilityIdentifier("food-\(food.id)")
                    }
                }
            }
            .searchable(text: $text, prompt: "Search foods")
            .navigationTitle("Match to a food")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .alert("Food", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(error ?? "") }
        }
    }

    private func detailLine(_ food: Food) -> String {
        var parts = [food.usdaDescription ?? ""]
        if let gi = food.glycemicIndex { parts.append("GI \(gi.value)") }
        parts.append(String(format: "%.0f g carbs · %.0f mg sodium · %.1f g sat fat per 100 g",
                            food.per100g.carbohydrate, food.per100g.sodium, food.per100g.saturatedFat))
        return parts.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private func perform(_ work: (RecipeBook) throws -> Void) {
        do {
            try work(environment.book)
            dismiss()
        } catch {
            self.error = "\(error)"
        }
    }
}
