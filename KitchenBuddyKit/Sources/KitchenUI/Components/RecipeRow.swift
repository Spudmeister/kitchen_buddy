import Foundation
import KitchenCore
import SwiftUI

/// A Library row: cover placeholder (photos arrive in M6), title, total
/// time, rating, up to three tags.
///
/// Requirements: kitchen-buddy-ios 6.4
struct RecipeRow: View {
    let recipe: RecipeSummary
    var thumbnailURL: URL?
    /// Profiles enabled in Settings; badges show only for known bands.
    var healthProfiles: [HealthProfile] = []

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            PhotoImage(url: thumbnailURL, maxPixelSize: 200)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.title)
                    .font(.headline)
                    .lineLimit(2)
                HStack(spacing: 8) {
                    if let minutes = recipe.totalMinutes {
                        Label(DurationText.minutes(minutes), systemImage: "clock")
                    }
                    if let rating = recipe.latestRating {
                        Label("\(rating)", systemImage: "star.fill")
                    }
                    if recipe.isArchived {
                        Label("Archived", systemImage: "archivebox")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .labelStyle(.titleAndIcon)
                if !recipe.tags.isEmpty {
                    TagChips(names: Array(recipe.tags.prefix(3)))
                }
                if let health = recipe.health {
                    let known = healthProfiles.map(health.score(for:)).filter { $0.band != .unknown }
                    if !known.isEmpty { HealthStrip(scores: known) }
                }
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
