import KitchenCore
import KitchenPersistence
import SwiftUI
import UniformTypeIdentifiers

/// Import Review sheet: counts, titles with "already in your book" flags,
/// Skip/Copy policy, destination folder, then a snapshot and one
/// transaction. Opened from Settings, the Library `+` menu, AirDrop, or
/// Files (Open In).
///
/// Requirements: kitchen-buddy-ios 14.1–14.5, 19.4
public struct ImportFileView: View {
    @State private var model: ImportFileViewModel
    private let environment: AppEnvironment
    private let initialURL: URL?
    @Environment(\.dismiss) private var dismiss
    @State private var isPickerPresented = false
    @State private var isFolderPickerPresented = false

    public static let recipesType = UTType(exportedAs: "net.puddleglum.kitchenbuddy.recipes", conformingTo: .json)

    public init(environment: AppEnvironment, url: URL?) {
        self.environment = environment
        self.initialURL = url
        _model = State(initialValue: ImportFileViewModel(environment: environment))
    }

    public var body: some View {
        NavigationStack {
            Form {
                if let summary = model.summary {
                    Section {
                        Label("Imported \(summary.imported) recipe\(summary.imported == 1 ? "" : "s")\(summary.skipped > 0 ? ", skipped \(summary.skipped)" : "")", systemImage: "checkmark.circle")
                        if summary.foldersCreated > 0 { Text("\(summary.foldersCreated) folders created").font(.footnote) }
                        if summary.photosWritten > 0 { Text("\(summary.photosWritten) photos added").font(.footnote) }
                    }
                } else if !model.problems.isEmpty {
                    Section("Couldn't import") {
                        ForEach(model.problems, id: \.self) { Label($0, systemImage: "exclamationmark.triangle") }
                        Button("Choose Another File") { isPickerPresented = true }
                    }
                } else if let preview = model.preview {
                    Section {
                        LabeledContent("Recipes", value: "\(preview.recipeCount)")
                        if preview.existingCount > 0 { LabeledContent("Already in your book", value: "\(preview.existingCount)") }
                        LabeledContent("Versions", value: "\(preview.versionCount)")
                        LabeledContent("Folders", value: "\(preview.folderCount)")
                        LabeledContent("Notes", value: "\(preview.noteCount)")
                        LabeledContent("Photos", value: "\(preview.photoCount)")
                        LabeledContent("Format", value: preview.source == .v2 ? "Kitchen Buddy recipes 2.0" : "Kitchen Buddy recipes (older JSON)")
                    }
                    if preview.existingCount > 0 {
                        Section {
                            Picker("Existing recipes", selection: $model.policy) {
                                Text("Skip").tag(ImportPolicy.skipExisting)
                                Text("Import as copies").tag(ImportPolicy.copyAsNew)
                            }
                            .pickerStyle(.segmented)
                        } footer: {
                            Text(model.policy == .skipExisting ? "Recipes already in your book are left as they are." : "Every recipe in the file is added as a new copy.")
                        }
                    }
                    Section {
                        Button { isFolderPickerPresented = true } label: {
                            LabeledContent("Put unfiled recipes in") { Text(folderName).foregroundStyle(.secondary) }
                        }
                        .tint(.primary)
                    }
                    Section("Recipes") {
                        ForEach(preview.entries) { entry in
                            HStack {
                                Text(entry.title)
                                Spacer()
                                if entry.exists { Text("in your book").font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                    }
                } else {
                    Section {
                        Button { isPickerPresented = true } label: { Label("Choose File…", systemImage: "doc") }
                            .accessibilityIdentifier("chooseImportFile")
                    } footer: {
                        Text("Kitchen Buddy recipe files (.kbrecipes or .json).")
                    }
                }
            }
            .navigationTitle("Import")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(model.summary == nil ? "Cancel" : "Done") { dismiss() } }
                if model.summary == nil {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Import") { Task { await model.performImport() } }
                            .disabled(!model.canImport)
                            .accessibilityIdentifier("confirmImport")
                    }
                }
            }
            .overlay { if model.isWorking { ProgressView("Importing…").padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)) } }
            .fileImporter(isPresented: $isPickerPresented, allowedContentTypes: [Self.recipesType, .json]) { result in
                if case .success(let url) = result { model.load(url) }
            }
            .sheet(isPresented: $isFolderPickerPresented) {
                FolderPickerView(environment: environment, selection: $model.destinationFolder)
            }
            .task {
                if let initialURL { model.load(initialURL) } else if model.reading == nil { isPickerPresented = true }
            }
            .alert("Import", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(model.error ?? "") }
        }
    }

    private var folderName: String {
        guard let id = model.destinationFolder, let folder = try? environment.book.folders.folder(id) else { return "Unfiled" }
        return folder.name
    }
}
