import KitchenCore
import KitchenPersistence
import SwiftUI

/// A recipe's photos in a three-column grid: tap to view full screen,
/// context menu for Set as Cover / Caption / Remove, Add Photo in the toolbar.
///
/// Requirements: kitchen-buddy-ios 11.1, 11.3, 11.4
public struct PhotoGalleryView: View {
    @State private var model: PhotoGalleryViewModel
    private let environment: AppEnvironment
    @State private var captioning: Photo?
    @State private var captionText = ""
    @State private var removing: Photo?

    public init(environment: AppEnvironment, recipeID: Recipe.ID) {
        self.environment = environment
        _model = State(initialValue: PhotoGalleryViewModel(environment: environment, recipeID: recipeID))
    }

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 4)]

    public var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(Array(model.photos.enumerated()), id: \.element.id) { index, photo in
                    Button {
                        environment.router.present(.photoViewer(model.recipeID, index: index))
                    } label: {
                        PhotoImage(url: model.thumbnailURL(for: photo), maxPixelSize: 400)
                            .frame(minHeight: 110)
                            .aspectRatio(1, contentMode: .fill)
                            .clipped()
                            .overlay(alignment: .topLeading) {
                                if index == 0 {
                                    Text("Cover").font(.caption2.bold()).padding(4)
                                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 4)).padding(4)
                                }
                            }
                            .overlay(alignment: .bottomLeading) {
                                if let caption = photo.caption {
                                    Text(caption).font(.caption2).lineLimit(1).padding(4)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(.thinMaterial)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Photo \(index + 1)\(index == 0 ? ", cover" : "")\(photo.caption.map { ", \($0)" } ?? "")")
                    .contextMenu {
                        if index != 0 {
                            Button { model.setCover(photo) } label: { Label("Set as Cover", systemImage: "star") }
                        }
                        Button { captionText = photo.caption ?? ""; captioning = photo } label: { Label("Caption…", systemImage: "text.below.photo") }
                        Button(role: .destructive) { removing = photo } label: { Label("Remove", systemImage: "trash") }
                    }
                }
            }
            .padding(4)
        }
        .overlay {
            if model.photos.isEmpty, !model.isImporting {
                ContentUnavailableView("No photos", systemImage: "photo",
                                       description: Text("Add photos from your library or the camera. The first one is the cover."))
            }
            if model.isImporting { ProgressView("Adding…").padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)) }
        }
        .navigationTitle("Photos")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                AddPhotoMenu { data in Task { await model.add(data) } }
            }
        }
        .task { model.load() }
        .onChange(of: environment.router.presented) { if $0 != nil && $1 == nil { model.load() } }
        .alert("Caption", isPresented: Binding(get: { captioning != nil }, set: { if !$0 { captioning = nil } })) {
            TextField("Caption", text: $captionText)
            Button("Save") { if let photo = captioning { model.setCaption(photo, captionText) }; captioning = nil }
            Button("Cancel", role: .cancel) { captioning = nil }
        }
        .confirmationDialog("Remove this photo?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Remove Photo", role: .destructive) { if let photo = removing { model.remove(photo) }; removing = nil }
            Button("Cancel", role: .cancel) { removing = nil }
        } message: {
            Text("The photo leaves the recipe. Its file is kept for 30 days.")
        }
        .alert("Photos", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }
}

/// Paged header on Detail; tap opens the viewer.
struct PhotoHeader: View {
    let environment: AppEnvironment
    let recipeID: Recipe.ID
    let photos: [Photo]

    var body: some View {
        TabView {
            ForEach(Array(photos.enumerated()), id: \.element.id) { index, photo in
                PhotoImage(url: environment.book.photos.url(for: photo), maxPixelSize: 1200)
                    .frame(height: 260)
                    .clipped()
                    .contentShape(Rectangle())
                    .onTapGesture { environment.router.present(.photoViewer(recipeID, index: index)) }
                    .accessibilityLabel("Photo \(index + 1) of \(photos.count)\(photo.caption.map { ", \($0)" } ?? "")")
                    .accessibilityAddTraits(.isButton)
            }
        }
        .frame(height: 260)
        .pagedTabs()
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

/// Full-screen viewer: swipe between photos, pinch to zoom, double-tap resets.
///
/// Requirements: kitchen-buddy-ios 11.5
struct PhotoViewerView: View {
    let environment: AppEnvironment
    let recipeID: Recipe.ID
    @State private var index: Int
    @State private var photos: [Photo] = []
    @Environment(\.dismiss) private var dismiss

    init(environment: AppEnvironment, recipeID: Recipe.ID, index: Int) {
        self.environment = environment
        self.recipeID = recipeID
        _index = State(initialValue: index)
    }

    var body: some View {
        NavigationStack {
            TabView(selection: $index) {
                ForEach(Array(photos.enumerated()), id: \.element.id) { i, photo in
                    ZoomableImage(url: environment.book.photos.url(for: photo)).tag(i)
                }
            }
            .pagedTabs()
            .background(Color.black)
            .navigationTitle(photos.indices.contains(index) ? (photos[index].caption ?? "\(index + 1) of \(photos.count)") : "")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.accessibilityIdentifier("closeViewer") } }
            .task { photos = (try? environment.book.photos.photos(for: recipeID)) ?? [] }
        }
    }
}

struct ZoomableImage: View {
    let url: URL
    @State private var scale: CGFloat = 1
    @State private var lastScale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    var body: some View {
        PhotoImage(url: url, maxPixelSize: 2048, contentMode: .fit)
            .scaleEffect(scale)
            .offset(offset)
            .gesture(
                MagnifyGesture()
                    .onChanged { value in scale = min(max(1, lastScale * value.magnification), 6) }
                    .onEnded { _ in lastScale = scale; if scale == 1 { offset = .zero; lastOffset = .zero } }
            )
            .simultaneousGesture(
                DragGesture()
                    .onChanged { value in
                        guard scale > 1 else { return }
                        offset = CGSize(width: lastOffset.width + value.translation.width, height: lastOffset.height + value.translation.height)
                    }
                    .onEnded { _ in lastOffset = offset }
            )
            .onTapGesture(count: 2) {
                withAnimation { scale = 1; lastScale = 1; offset = .zero; lastOffset = .zero }
            }
            .accessibilityLabel("Photo")
            .accessibilityHint("Pinch to zoom, double-tap to reset")
    }
}

private extension View {
    @ViewBuilder func pagedTabs() -> some View {
        #if os(iOS)
        tabViewStyle(.page(indexDisplayMode: .automatic))
        #else
        self
        #endif
    }
}
