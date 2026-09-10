import KitchenCore
import SwiftUI

/// The auditable estimate: per-serving figures with bands, then every
/// ingredient line with its match, grams and contribution, the lines that
/// were not counted and why, and the sources. Tapping a line opens the
/// food picker.
///
/// Requirements: kitchen-buddy-ios 21.3–21.7
public struct HealthWorksheetView: View {
    @State private var model: HealthWorksheetViewModel
    private let environment: AppEnvironment

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        _model = State(initialValue: HealthWorksheetViewModel(environment: environment, recipeID: recipeID))
    }

    public var body: some View {
        List {
            Section {
                Text(model.servingsText).font(.headline)
                ForEach(model.scores, id: \.profile) { score in
                    VStack(alignment: .leading, spacing: 4) {
                        HealthBadge(score: score, compact: false)
                        Text(thresholdText(score.profile)).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Text(model.coverageText).font(.footnote).foregroundStyle(.secondary)
                    .accessibilityIdentifier("coverageText")
            } header: {
                Text("Per serving")
            } footer: {
                Text("Estimates from typical ingredients, not medical advice. Tap any line to correct what it was matched to.")
            }

            if !model.countedLines.isEmpty {
                Section("Counted") {
                    ForEach(model.countedLines) { line in
                        Button { pick(line) } label: { countedRow(line) }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("countedLine")
                    }
                }
            }
            if !model.uncountedLines.isEmpty {
                Section {
                    ForEach(model.uncountedLines) { line in
                        Button { pick(line) } label: { uncountedRow(line) }
                            .buttonStyle(.plain)
                            .disabled(line.status == .seasoning)
                            .accessibilityIdentifier("uncountedLine")
                    }
                } header: {
                    Text("Not counted")
                } footer: {
                    Text("Seasonings and lines without a quantity never count. Lines with no matching food or a measure that can't become grams lower the coverage; pick a food to count them.")
                }
            }

            Section("Sources") {
                Text(FoodTable.nutrientSource).font(.footnote)
                Text(FoodTable.glycemicIndexSource).font(.footnote)
                NavigationLink(value: Route.healthSources) { Text("Thresholds and table version") }
            }
        }
        .insetGroupedList()
        .navigationTitle("Health worksheet")
        .inlineTitle()
        .task { model.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
        .alert("Worksheet", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }

    private func pick(_ line: LineEstimate) {
        environment.router.present(.foodPicker(model.recipeID, ingredientName: line.ingredient.name))
    }

    private func thresholdText(_ profile: HealthProfile) -> String {
        let t = profile.thresholds
        let unit = profile.unitLabel.isEmpty ? "" : " \(profile.unitLabel)"
        return "\(profile.measureName): low ≤ \(format(t.low))\(unit), medium ≤ \(format(t.medium))\(unit), high above"
    }

    private func format(_ value: Double) -> String { value == value.rounded() ? "\(Int(value))" : String(format: "%.1f", value) }

    private func ingredientText(_ ingredient: Ingredient) -> String {
        [QuantityFormatter.string(quantity: ingredient.quantity, unit: ingredient.unit), ingredient.name]
            .compactMap { $0 }.joined(separator: " ")
    }

    private func countedRow(_ line: LineEstimate) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(ingredientText(line.ingredient)).fontWeight(.medium)
                Spacer()
                if let grams = line.grams { Text("\(Int(grams.rounded())) g").foregroundStyle(.secondary).monospacedDigit() }
            }
            Text(model.matchText(line)).font(.subheadline).foregroundStyle(model.isOverridden(line) ? Color.accentColor : .secondary)
            if let basis = line.gramsBasis { Text("Grams: \(basis.description)").font(.caption).foregroundStyle(.tertiary) }
            if let n = line.nutrients {
                Text(contribution(line, n)).font(.caption).foregroundStyle(.secondary).monospacedDigit()
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func contribution(_ line: LineEstimate, _ n: Food.Nutrients) -> String {
        var parts: [String] = []
        if model.profiles.contains(.diabetes) {
            let gi = line.match?.food.glycemicIndex.map { "GI \($0.value) (\($0.basis))" } ?? "no GI: \(line.match?.food.glycemicIndexNote ?? "")"
            parts.append(String(format: "Carbs %.1f g (available %.1f) · %@ · GL %.1f", n.carbohydrate, n.availableCarbohydrate, gi, line.glycemicLoad ?? 0))
        }
        if model.profiles.contains(.bloodPressure) { parts.append("Sodium \(Int(n.sodium.rounded())) mg") }
        if model.profiles.contains(.heartHealth) { parts.append(String(format: "Sat fat %.1f g", n.saturatedFat)) }
        return parts.joined(separator: " · ")
    }

    private func uncountedRow(_ line: LineEstimate) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(ingredientText(line.ingredient)).fontWeight(.medium)
            Text((line.match.map { "\($0.food.name): " } ?? "") + line.status.reason).font(.subheadline).foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}
