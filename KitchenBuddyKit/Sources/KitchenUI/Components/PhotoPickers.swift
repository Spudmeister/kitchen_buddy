import PhotosUI
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// A menu offering the photo library (PhotosUI) and, where available, the
/// camera. Delivers raw image data; the store does the decoding.
///
/// Requirements: kitchen-buddy-ios 11.1
struct AddPhotoMenu: View {
    let onData: (Data) -> Void
    @State private var selection: [PhotosPickerItem] = []
    @State private var isCameraPresented = false

    var body: some View {
        Menu {
            PhotosPicker(selection: $selection, maxSelectionCount: 10, matching: .images) {
                Label("Photo Library", systemImage: "photo.on.rectangle")
            }
            if CameraPicker.isAvailable {
                Button { isCameraPresented = true } label: { Label("Take Photo", systemImage: "camera") }
            }
        } label: {
            Label("Add Photo", systemImage: "plus")
        }
        .accessibilityIdentifier("addPhotoMenu")
        .onChange(of: selection) {
            let items = selection
            selection = []
            Task {
                for item in items {
                    if let data = try? await item.loadTransferable(type: Data.self) { onData(data) }
                }
            }
        }
        .sheet(isPresented: $isCameraPresented) {
            CameraPicker { data in onData(data) }
        }
    }
}

#if os(iOS)
/// UIImagePickerController for the camera (no SwiftUI equivalent).
struct CameraPicker: UIViewControllerRepresentable {
    let onData: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    static var isAvailable: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.95) {
                parent.onData(data)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
#else
struct CameraPicker: View {
    let onData: (Data) -> Void
    static var isAvailable: Bool { false }
    var body: some View { EmptyView() }
}
#endif
