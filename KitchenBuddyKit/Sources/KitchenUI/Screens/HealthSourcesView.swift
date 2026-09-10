import KitchenCore
import SwiftUI

/// Settings › Health › Sources & thresholds: where the numbers come from.
///
/// Requirements: kitchen-buddy-ios 21.7
public struct HealthSourcesView: View {
    public init() {}

    public var body: some View {
        List {
            Section("How a recipe is scored") {
                Text("Each ingredient line is matched to a food in the bundled table by the longest keyword in its name. Its quantity becomes grams (weights directly, volumes through the food's density, counts through a typical piece weight). The food's nutrients per 100 g give the line's carbohydrate, fibre, sodium and saturated fat; glycemic load is the glycemic index times the available carbohydrate (total minus fibre) divided by 100. Totals are divided by the servings you get. If fewer than \(Int(RecipeNutrition.minimumCoverage * 100))% of the countable lines could be counted, no band is shown.")
                    .font(.footnote)
            }
            Section("Thresholds, per serving") {
                ForEach(HealthProfile.allCases, id: \.self) { profile in
                    VStack(alignment: .leading, spacing: 4) {
                        Label(profile.title, systemImage: profile.symbolName).font(.headline)
                        Text(profile.explanation).font(.footnote)
                        Text(profile.thresholdSource).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            Section("Data") {
                LabeledContent("Food table", value: "v\(FoodTable.version), \(FoodTable.foods.count) foods")
                Text(FoodTable.nutrientSource).font(.footnote)
                Text(FoodTable.glycemicIndexSource).font(.footnote)
                Text("Where the tables have no measurement for a food, the worksheet says so: “proxy” uses a close relative's value, “assumed” a conservative figure for a low-carbohydrate food.").font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Text("These are estimates from typical ingredients, not measurements of your dish, and not medical advice. Talk to your clinician or dietitian about your own targets.")
                    .font(.footnote)
            }
        }
        .insetGroupedList()
        .navigationTitle("Sources & thresholds")
        .inlineTitle()
    }
}
