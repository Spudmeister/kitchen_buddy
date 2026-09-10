import KitchenCore
import KitchenPersistence
import SwiftUI

/// Remap one ingredient line: the close matches first (every food whose
/// keyword appears in the name, best first, then foods sharing a word),
/// then the whole table by search. The choice is book-wide unless "Only
/// this recipe" is on; "Report this match" pre-fills feedback so the
/// shipped table can be fixed.
///
/// Requirements: kitchen-buddy-ios 21.6, 21.11
public struct FoodPickerView: View {
    private let environment: AppEnvironment
    private let recipeID: Recipe.ID
    private let ingredientName: String
    @State private var text = ""
    @State private var onlyThisRecipe = false
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    public init(environment: AppEnvironment, recipeID: Recipe.ID, ingredientName: String) {
        self.environment = environment
        self.recipeID = recipeID
        self.ingredientName = ingredientName
    }

    private var automatic: FoodMatch? { FoodMatcher.match(ingredientName) }
    private var closeMatches: [Food] { FoodMatcher.candidates(ingredientName) }
    private var searchResults: [Food] { FoodTable.search(text) }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    if let automatic {
                        Button {
                            perform { book in
                                try book.recipes.clearFoodOverride(recipeID, ingredientName: ingredientName)
                                if !onlyThisRecipe { try book.recipes.clearFoodMapping(ingredientName: ingredientName) }
                            }
                        } label: {
                            Label("Automatic: \(automatic.food.name)", systemImage: "wand.and.stars")
                        }
                        .accessibilityIdentifier("foodAutomatic")
                    }
                    Button(role: .destructive) {
                        choose(nil)
                    } label: {
                        Label("Don't count this ingredient", systemImage: "minus.circle")
                    }
                    .accessibilityIdentifier("foodDontCount")
                    Toggle("Only this recipe", isOn: $onlyThisRecipe)
                        .accessibilityIdentifier("onlyThisRecipe")
                } header: {
                    Text("“\(ingredientName)”")
                } footer: {
                    Text(onlyThisRecipe
                         ? "Applies to this recipe only."
                         : "Applies to every recipe with this ingredient name — a wrong match is a data problem, not a recipe problem.")
                }

                if text.isEmpty, !closeMatches.isEmpty {
                    Section("Close matches") {
                        ForEach(closeMatches) { food in foodRow(food) }
                    }
                    .accessibilityIdentifier("closeMatches")
                }

                Section(text.isEmpty ? "All foods" : (searchResults.isEmpty ? "No foods match" : "Foods")) {
                    ForEach(searchResults) { food in foodRow(food) }
                }

                if let report = reportURL {
                    Section {
                        Link(destination: report) { Label("Report this match", systemImage: "envelope") }
                            .accessibilityIdentifier("reportMatch")
                    } footer: {
                        Text("Sends what this ingredient matched and what you chose, so the built-in table can be corrected for everyone.")
                    }
                }
            }
            .searchable(text: $text, prompt: "Search all foods")
            .navigationTitle("Match to a food")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .alert("Food", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(error ?? "") }
        }
    }

    private func foodRow(_ food: Food) -> some View {
        Button {
            choose(food.id)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(food.name)
                    if food.id == automatic?.food.id {
                        Text("automatic").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Text(detailLine(food)).font(.caption).foregroundStyle(.secondary)
            }
        }
        .accessibilityIdentifier("food-\(food.id)")
    }

    private func choose(_ foodID: Food.ID?) {
        perform { book in
            if onlyThisRecipe {
                try book.recipes.setFoodOverride(recipeID, ingredientName: ingredientName, foodID: foodID)
            } else {
                try book.recipes.setFoodMapping(ingredientName: ingredientName, foodID: foodID)
                try book.recipes.clearFoodOverride(recipeID, ingredientName: ingredientName)
            }
        }
    }

    private func detailLine(_ food: Food) -> String {
        var parts = [food.usdaDescription ?? ""]
        if let gi = food.glycemicIndex { parts.append("GI \(gi.value)") }
        parts.append(String(format: "%.0f g carbs · %.0f mg sodium · %.1f g sat fat per 100 g",
                            food.per100g.carbohydrate, food.per100g.sodium, food.per100g.saturatedFat))
        return parts.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    /// The Settings feedback address with subject and body pre-filled.
    private var reportURL: URL? {
        guard let base = environment.feedbackURL,
              var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
        let matched = automatic.map { "\($0.food.name) (keyword “\(keywordText($0))”)" } ?? "nothing"
        let body = """
        Ingredient: \(ingredientName)
        Automatic match: \(matched)
        Should be: (say which food, or "don't count")
        Food table v\(FoodTable.version)
        """
        components.queryItems = [URLQueryItem(name: "subject", value: "Kitchen Buddy food match: \(ingredientName)"),
                                 URLQueryItem(name: "body", value: body)]
        return components.url
    }

    private func keywordText(_ match: FoodMatch) -> String {
        if case .keyword(let keyword) = match.source { return keyword }
        return ""
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
