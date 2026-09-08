import KitchenPersistence
import SwiftUI

/// The non-dismissable notice shown after a launch-time recovery: what
/// happened, what was restored, and a way to export the damaged file.
/// There is deliberately no "start fresh" button (ADR-003).
///
/// Requirements: kitchen-buddy-ios 17.5
public struct RecoveryView: View {
    @Bindable var environment: AppEnvironment

    public init(environment: AppEnvironment) {
        self.environment = environment
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Image(systemName: "bandage")
                        .font(.system(size: 56))
                        .foregroundStyle(.orange)
                        .padding(.top, 32)
                    Text("Your recipe book was recovered")
                        .font(.title2.bold())
                        .multilineTextAlignment(.center)
                    Text(explanation)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    if case .recovered(let damaged, _) = environment.launchReport {
                        ShareLink(item: damaged) {
                            Label("Export Damaged File", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.bordered)
                    }
                    Button("Continue") { environment.isRecoveryPresented = false }
                        .buttonStyle(.borderedProminent)
                        .padding(.top, 8)
                }
                .padding(24)
                .frame(maxWidth: 520)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("Recovery")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
        }
        .interactiveDismissDisabled()
    }

    private var explanation: String {
        guard case .recovered(_, let restored) = environment.launchReport else { return "" }
        var text = "The recipe database failed its integrity check when the app opened. The damaged file was moved aside — not deleted — so nothing is lost for good."
        if let restored {
            let when = restored.createdAt.formatted(date: .abbreviated, time: .shortened)
            text += "\n\nYour book was restored from the verified backup taken \(when), holding \(restored.verification?.recipeCount ?? 0) recipes."
        } else {
            text += "\n\nNo verified backup was found, so the book is starting empty. Export the damaged file and keep it: recipes can often be recovered from it."
        }
        return text
    }
}

#Preview {
    RecoveryView(environment: .preview())
}
