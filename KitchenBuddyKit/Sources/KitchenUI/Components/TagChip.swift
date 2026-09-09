import SwiftUI

struct TagChip: View {
    let name: String

    var body: some View {
        Text(name)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.tint.opacity(0.12), in: Capsule())
            .foregroundStyle(.tint)
            .accessibilityLabel("Tag \(name)")
    }
}

struct TagChips: View {
    let names: [String]

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(names, id: \.self) { TagChip(name: $0) }
        }
    }
}
