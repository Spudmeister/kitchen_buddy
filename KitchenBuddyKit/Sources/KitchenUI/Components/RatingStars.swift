import SwiftUI

/// Five stars; tappable when `onSelect` is given. VoiceOver reads the value
/// and adjusts with swipe up/down.
///
/// Requirements: kitchen-buddy-ios 15.1, 15.2, 19.1
struct RatingStars: View {
    let value: Int?
    var onSelect: ((Int) -> Void)?

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= (value ?? 0) ? "star.fill" : "star")
                    .foregroundStyle(star <= (value ?? 0) ? Color.yellow : Color.secondary)
                    .frame(minWidth: onSelect == nil ? nil : 44, minHeight: onSelect == nil ? nil : 44)
                    .contentShape(Rectangle())
                    .onTapGesture { onSelect?(star) }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Rating")
        .accessibilityValue(value.map { "\($0) of 5 stars" } ?? "Not rated")
        .accessibilityHint(onSelect == nil ? "" : "Swipe up or down to change")
        .accessibilityAdjustableAction { direction in
            guard let onSelect else { return }
            let current = value ?? 0
            switch direction {
            case .increment: onSelect(min(5, current + 1))
            case .decrement: onSelect(max(1, current - 1))
            @unknown default: break
            }
        }
    }
}
