import KitchenCore
import KitchenPersistence
import SwiftUI

/// Backups: verified snapshots (restore, share, verify), iCloud status and
/// restore-from-iCloud, damaged databases (share only).
///
/// Requirements: kitchen-buddy-ios 17.3, 17.6, 17.7, 18.4
public struct BackupsView: View {
    @State private var model: BackupsViewModel

    public init(environment: AppEnvironment) {
        _model = State(initialValue: BackupsViewModel(environment: environment))
    }

    public var body: some View {
        List {
            Section {
                Button {
                    Task { await model.backUpNow() }
                } label: {
                    Label("Back Up Now", systemImage: "arrow.down.doc")
                }
                .disabled(model.isBusy)
            } footer: {
                Text("\(model.liveRecipeCount) recipes in the book. Every snapshot is checked before it is trusted; only verified snapshots can be restored.")
            }

            Section("Snapshots") {
                if model.snapshots.isEmpty {
                    Text("No snapshots yet.").foregroundStyle(.secondary)
                }
                ForEach(model.snapshots) { snapshot in
                    SnapshotRow(snapshot: snapshot)
                        .contentShape(Rectangle())
                        .onTapGesture { if snapshot.isVerified { model.pendingRestore = snapshot } }
                        .contextMenu {
                            if snapshot.isVerified {
                                Button("Restore…") { model.pendingRestore = snapshot }
                            }
                            if !snapshot.isBad {
                                Button("Verify") { Task { await model.verify(snapshot) } }
                            }
                            ShareLink("Share", item: snapshot.url)
                        }
                }
            }

            Section {
                if let status = model.cloudStatus {
                    LabeledContent("iCloud Drive", value: status.isAvailable ? "Available" : "Unavailable")
                    if let reason = status.unavailableReason {
                        Text(reason).font(.footnote).foregroundStyle(.secondary)
                    }
                    if let date = status.lastCopiedAt {
                        LabeledContent("Last copy", value: date.formatted(date: .abbreviated, time: .shortened))
                    }
                    if let error = status.lastError {
                        Text("Last copy failed: \(error)").font(.footnote).foregroundStyle(.red)
                    }
                } else {
                    LabeledContent("iCloud Drive", value: "Checking…")
                }
                Button("Copy Newest Snapshot to iCloud") { Task { await model.copyToCloudNow() } }
                    .disabled(model.isBusy || model.cloudStatus?.isAvailable != true)
                Button("Restore from iCloud…") {
                    model.isCloudPickerPresented = true
                    Task { await model.loadCloudSnapshots() }
                }
                .disabled(model.isBusy || model.cloudStatus?.isAvailable != true)
            } header: {
                Text("iCloud")
            } footer: {
                Text("Copies appear in Files › iCloud Drive › Kitchen Buddy › Backups.")
            }

            if !model.damagedFiles.isEmpty {
                Section {
                    ForEach(model.damagedFiles, id: \.self) { url in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(url.lastPathComponent).font(.footnote.monospaced())
                                Text("Moved aside at launch after failing a check.").font(.footnote).foregroundStyle(.secondary)
                            }
                            Spacer()
                            ShareLink(item: url) { Image(systemName: "square.and.arrow.up") }
                        }
                    }
                } header: {
                    Text("Damaged databases")
                } footer: {
                    Text("Kept for recovery, never deleted. Share one to get help extracting recipes from it.")
                }
            }
        }
        .navigationTitle("Backups")
        .task { model.refresh() }
        .refreshable { model.refresh() }
        .overlay {
            if model.isBusy {
                VStack(spacing: 12) {
                    ProgressView().controlSize(.large)
                    if let text = model.busyMessage { Text(text).font(.footnote) }
                }
                .padding(24)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
        .confirmationDialog("Restore this snapshot?", isPresented: restoreDialogPresented, presenting: model.pendingRestore) { snapshot in
            Button("Restore \(snapshot.verification?.recipeCount ?? 0) recipes", role: .destructive) {
                Task { await model.restore(snapshot) }
            }
            Button("Cancel", role: .cancel) {}
        } message: { snapshot in
            Text("Your current recipe book will be saved as a safety copy first, then replaced with the snapshot from \(snapshot.createdAt.formatted(date: .abbreviated, time: .shortened)).")
        }
        .sheet(isPresented: $model.isCloudPickerPresented) {
            CloudSnapshotsSheet(model: model)
        }
        .alert("Backups", isPresented: Binding(get: { model.message != nil }, set: { if !$0 { model.message = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.message ?? "")
        }
    }

    private var restoreDialogPresented: Binding<Bool> {
        Binding(get: { model.pendingRestore != nil }, set: { if !$0 { model.pendingRestore = nil } })
    }
}

struct SnapshotRow: View {
    let snapshot: Snapshot

    var body: some View {
        HStack(spacing: 12) {
            badge
                .font(.title3)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(snapshot.createdAt.formatted(date: .abbreviated, time: .shortened))
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(snapshot.reason.displayName)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    @ViewBuilder private var badge: some View {
        if snapshot.isVerified {
            Image(systemName: "checkmark.seal.fill").foregroundStyle(.green)
        } else if snapshot.isBad || snapshot.verification?.passed == false {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
        } else {
            Image(systemName: "questionmark.circle").foregroundStyle(.secondary)
        }
    }

    private var detail: String {
        let size = ByteCountFormatter.string(fromByteCount: snapshot.sizeBytes, countStyle: .file)
        if let verification = snapshot.verification {
            return verification.passed ? "\(verification.recipeCount) recipes · \(size) · verified"
                : "Failed verification · \(size)"
        }
        return "\(size) · not verified yet"
    }

    private var accessibilityText: String {
        "\(snapshot.reason.displayName) snapshot, \(snapshot.createdAt.formatted(date: .abbreviated, time: .shortened)), \(detail)"
    }
}

struct CloudSnapshotsSheet: View {
    @Bindable var model: BackupsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if model.cloudSnapshots.isEmpty && !model.isBusy {
                    Text("No snapshots in iCloud Drive yet.").foregroundStyle(.secondary)
                }
                ForEach(model.cloudSnapshots) { snapshot in
                    Button {
                        dismiss()
                        Task { await model.restoreFromCloud(snapshot) }
                    } label: {
                        SnapshotRow(snapshot: snapshot)
                    }
                    .tint(.primary)
                }
            }
            .overlay { if model.isBusy { ProgressView() } }
            .navigationTitle("Restore from iCloud")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

#Preview {
    NavigationStack { BackupsView(environment: .preview()) }
}
