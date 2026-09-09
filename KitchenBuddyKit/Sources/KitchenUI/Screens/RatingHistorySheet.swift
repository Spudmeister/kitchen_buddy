import KitchenCore
import KitchenPersistence
import SwiftUI

/// Every rating event, newest first; nothing here can be edited.
///
/// Requirements: kitchen-buddy-ios 15.3
struct RatingHistorySheet: View {
    let environment: AppEnvironment
    let recipeID: Recipe.ID
    @Environment(\.dismiss) private var dismiss
    @State private var events: [RatingEvent] = []

    var body: some View {
        NavigationStack {
            List(events.reversed()) { event in
                HStack {
                    if let value = event.value {
                        RatingStars(value: value)
                    } else {
                        Label("Cleared", systemImage: "star.slash").foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(event.date.formatted(date: .abbreviated, time: .shortened))
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
            }
            .overlay {
                if events.isEmpty {
                    ContentUnavailableView("Not rated yet", systemImage: "star")
                }
            }
            .navigationTitle("Rating History")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { events = (try? environment.book.recipes.ratingEvents(recipeID)) ?? [] }
        }
    }
}
