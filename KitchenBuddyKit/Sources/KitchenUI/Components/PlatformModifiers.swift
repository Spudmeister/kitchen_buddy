import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// iOS-only modifiers that must compile away on macOS, where the package
/// builds only so tests run headlessly.
extension View {
    @ViewBuilder func insetGroupedList() -> some View {
        #if os(iOS)
        listStyle(.insetGrouped)
        #else
        self
        #endif
    }

    @ViewBuilder func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    @ViewBuilder func numberKeyboard() -> some View {
        #if os(iOS)
        keyboardType(.numbersAndPunctuation)
        #else
        self
        #endif
    }

    @ViewBuilder func urlKeyboard() -> some View {
        #if os(iOS)
        keyboardType(.URL).textInputAutocapitalization(.never)
        #else
        self
        #endif
    }

    /// Puts a List/Form into edit mode (drag handles, delete affordances).
    @ViewBuilder func reorderMode(active: Bool) -> some View {
        #if os(iOS)
        environment(\.editMode, .constant(active ? .active : .inactive))
        #else
        self
        #endif
    }

    @ViewBuilder func noAutocapitalization() -> some View {
        #if os(iOS)
        textInputAutocapitalization(.never)
        #else
        self
        #endif
    }
}

/// Resigns the first responder so a drag or mode change never fights the
/// keyboard (iOS only; a no-op elsewhere).
enum Keyboard {
    static func dismiss() {
        #if canImport(UIKit)
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        #endif
    }
}

/// `EditButton` exists only on iOS.
struct ReorderButton: View {
    var body: some View {
        #if os(iOS)
        EditButton()
        #else
        EmptyView()
        #endif
    }
}
