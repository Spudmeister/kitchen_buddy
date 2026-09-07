import SwiftUI

/// Bootstrap placeholder; M2 replaces this with the Library screen behind a
/// `NavigationStack` and typed `Route`s.
public struct RootView: View {
    public init() {}

    public var body: some View {
        NavigationStack {
            ContentUnavailableView(
                "Kitchen Buddy",
                systemImage: "book.closed",
                description: Text("Your recipe book is on its way.")
            )
            .navigationTitle("Recipes")
        }
    }
}
