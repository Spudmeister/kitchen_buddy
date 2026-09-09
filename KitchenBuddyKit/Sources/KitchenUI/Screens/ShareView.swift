import KitchenCore
import KitchenPersistence
import SwiftUI

/// Export / Share sheet: PDF or Kitchen Buddy file, Share vs Backup, photos.
///
/// Requirements: kitchen-buddy-ios 13.1–13.5
public struct ShareView: View {
    @State private var model: ShareViewModel
    @Environment(\.dismiss) private var dismiss

    public init(environment: AppEnvironment, scope: ExportOptions.Scope, backup: Bool = false, pdfInput: PDFRenderer.Input? = nil) {
        let model = ShareViewModel(environment: environment, scope: scope, backup: backup)
        model.pdfInput = pdfInput
        _model = State(initialValue: model)
    }

    public var body: some View {
        NavigationStack {
            Form {
                if model.canMakePDF {
                    Picker("Format", selection: $model.kind) {
                        Text("Kitchen Buddy file").tag(ShareViewModel.Kind.file)
                        Text("PDF").tag(ShareViewModel.Kind.pdf)
                    }
                    .pickerStyle(.segmented)
                }
                if model.kind == .file {
                    Section {
                        Toggle("Include photos", isOn: $model.includePhotos)
                        Toggle("Include notes, ratings and history", isOn: $model.includeHistory)
                    } footer: {
                        Text(model.includeHistory ? "A full record: every version, note and rating." : "Just the recipe as it is now.")
                    }
                } else {
                    Section { Text("Letter-size PDF with the cover photo, ingredients as shown on screen, and steps.").font(.footnote).foregroundStyle(.secondary) }
                }
                Section {
                    if let url = model.fileURL {
                        ShareLink(item: url) {
                            Label("Share \(url.lastPathComponent)", systemImage: "square.and.arrow.up")
                        }
                        .accessibilityIdentifier("shareFileLink")
                        if let bytes = model.estimatedBytes {
                            Text(ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)).font(.footnote).foregroundStyle(.secondary)
                        }
                    } else {
                        Button("Prepare") { Task { await model.prepare() } }.disabled(model.isWorking)
                            .accessibilityIdentifier("prepareShare")
                    }
                }
            }
            .navigationTitle(model.includeHistory && model.scope == .all ? "Export Backup" : "Share")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
            .overlay { if model.isWorking { ProgressView("Preparing…").padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)) } }
            .task { await model.prepare() }
            .onChange(of: model.kind) { Task { await model.prepare() } }
            .onChange(of: model.includePhotos) { Task { await model.prepare() } }
            .onChange(of: model.includeHistory) { Task { await model.prepare() } }
            .alert("Share", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(model.error ?? "") }
        }
    }
}
