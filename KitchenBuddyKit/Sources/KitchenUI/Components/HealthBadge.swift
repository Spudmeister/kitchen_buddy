import KitchenCore
import SwiftUI

/// A profile's band, tinted by band and never colour alone: the band
/// symbol plus a figure. `compact` is the Library strip segment ("✓ GL 8");
/// the full form is a labelled row for the detail and worksheet
/// ("Diabetes ………… ✓ GL 8 · Friendly").
///
/// Requirements: kitchen-buddy-ios 19.2, 21.5, 21.6
struct HealthBadge: View {
    enum Layout { case automatic, inline, stacked }

    let score: HealthScore
    var compact = false
    /// Full form only: `.automatic` stacks when the pill can't fit beside
    /// the label; `HealthRows` forces one layout for a whole card.
    var layout: Layout = .automatic
    @Environment(\.dynamicTypeSize) private var typeSize

    private var color: Color {
        switch score.band {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        case .unknown: return .gray
        }
    }

    private var figure: String {
        score.value.map(score.profile.format) ?? (compact ? "\(score.profile.shortMeasureName) ?" : "no data")
    }

    var body: some View {
        Group {
            if compact {
                HStack(spacing: 3) {
                    Image(systemName: score.band.symbolName)
                    Text(figure)
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(color)
            } else if typeSize.isAccessibilitySize || layout == .stacked {
                stacked
            } else if layout == .inline {
                inline
            } else {
                // One line when the pill fits beside the label, else stacked.
                ViewThatFits(in: .horizontal) {
                    inline
                    stacked
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
        .accessibilityIdentifier("healthBadge-\(score.profile.rawValue)")
    }

    private var inline: some View {
        HStack(spacing: 10) {
            Label(score.profile.title, systemImage: score.profile.symbolName)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
            Spacer(minLength: 8)
            pill.lineLimit(1).fixedSize()
        }
    }

    private var stacked: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(score.profile.title, systemImage: score.profile.symbolName)
                .font(.subheadline.weight(.medium))
            pill
        }
    }

    /// "✓ GL 8 · Friendly" in a tinted capsule.
    private var pill: some View {
        HStack(spacing: 5) {
            Image(systemName: score.band.symbolName)
            Text(figure)
            Text("·").foregroundStyle(.secondary)
            Text(score.band.friendliness)
        }
        .font(.subheadline)
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.14), in: Capsule())
        .fixedSize(horizontal: false, vertical: true)
    }

    private var accessibilityText: String {
        let value = score.value.map { "\(score.profile.measureName) \(score.profile.formatValue($0)) per serving" } ?? "not enough data"
        return "\(score.profile.title): \(score.band.friendliness), \(value)"
    }
}

/// A card of full badges that share one layout: inline rows when every
/// pill fits beside its label, otherwise every row stacked.
struct HealthRows: View {
    let scores: [HealthScore]
    var spacing: CGFloat = 8

    var body: some View {
        ViewThatFits(in: .horizontal) {
            VStack(alignment: .leading, spacing: spacing) {
                ForEach(scores, id: \.profile) { HealthBadge(score: $0, layout: .inline) }
            }
            VStack(alignment: .leading, spacing: spacing + 4) {
                ForEach(scores, id: \.profile) { HealthBadge(score: $0, layout: .stacked) }
            }
        }
    }
}

/// The Library row's one-line strip: compact badges separated by dots,
/// wrapping only at large text sizes.
struct HealthStrip: View {
    let scores: [HealthScore]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(scores, id: \.profile) { HealthBadge(score: $0, compact: true) }
        }
        .accessibilityElement(children: .combine)
    }
}
