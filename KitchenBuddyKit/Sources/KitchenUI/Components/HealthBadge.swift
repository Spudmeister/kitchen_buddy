import KitchenCore
import SwiftUI

/// A profile's band as a capsule: symbol + figure, tinted by band, never
/// colour alone. Compact for Library rows ("GL 8"), full on the detail
/// ("Diabetes · GL 8 · Friendly").
///
/// Requirements: kitchen-buddy-ios 19.2, 21.5, 21.6
struct HealthBadge: View {
    let score: HealthScore
    var compact = false

    private var color: Color {
        switch score.band {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        case .unknown: return .gray
        }
    }

    private var figure: String {
        score.value.map(score.profile.format) ?? (compact ? "?" : "no data")
    }

    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        Group {
            if compact {
                HStack(spacing: 5) {
                    Image(systemName: score.band.symbolName)
                    Text(figure)
                }
            } else if typeSize.isAccessibilitySize {
                // Stacked at accessibility sizes so words never break into columns.
                VStack(alignment: .leading, spacing: 2) {
                    Label(score.profile.title, systemImage: score.band.symbolName).fontWeight(.semibold)
                    Text("\(figure) · \(score.band.friendliness)")
                }
            } else {
                HStack(spacing: 5) {
                    Image(systemName: score.band.symbolName)
                    Text(score.profile.title).fontWeight(.semibold)
                    Text("·").foregroundStyle(.secondary)
                    Text(figure)
                    Text("·").foregroundStyle(.secondary)
                    Text(score.band.friendliness)
                }
            }
        }
        .font(compact ? .caption.weight(.medium) : .subheadline)
        .foregroundStyle(color)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 3 : 6)
        .background(color.opacity(0.14), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
        .accessibilityIdentifier("healthBadge-\(score.profile.rawValue)")
    }

    private var accessibilityText: String {
        let value = score.value.map { "\(score.profile.measureName) \(score.profile.format($0)) per serving" } ?? "not enough data"
        return "\(score.profile.title): \(score.band.friendliness), \(value)"
    }
}
