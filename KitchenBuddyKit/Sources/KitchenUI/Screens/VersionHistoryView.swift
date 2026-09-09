import KitchenCore
import KitchenPersistence
import SwiftUI

/// Version History: newest first, with what changed; tap to view read-only,
/// restore from there.
///
/// Requirements: kitchen-buddy-ios 2.3–2.5
public struct VersionHistoryView: View {
    @State private var model: VersionHistoryViewModel

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        _model = State(initialValue: VersionHistoryViewModel(environment: environment, recipeID: recipeID))
    }

    public var body: some View {
        List(model.entries) { entry in
            NavigationLink(value: Route.recipeVersion(model.recipeID, version: entry.version.version)) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("v\(entry.version.version)").font(.headline.monospacedDigit())
                        Text(entry.version.title).lineLimit(1)
                        Spacer()
                        if entry.isCurrent {
                            Text("Current").font(.caption).padding(.horizontal, 6).padding(.vertical, 2)
                                .background(.tint.opacity(0.15), in: Capsule()).foregroundStyle(.tint)
                        }
                    }
                    Text(entry.version.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.subheadline).foregroundStyle(.secondary)
                    Text(entry.summary).font(.footnote).foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .insetGroupedList()
        .navigationTitle("Version History")
        .task { model.load() }
        .refreshable { model.load() }
        .alert("Versions", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }
}
