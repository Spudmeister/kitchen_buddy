import KitchenCore
import KitchenPersistence
import SwiftUI

/// Settings: display preferences, backups entry point, iCloud switch,
/// maintenance, samples (Debug/TestFlight), About.
///
/// Requirements: kitchen-buddy-ios 18.1–18.4
public struct SettingsView: View {
    @State private var model: SettingsViewModel

    public init(environment: AppEnvironment) {
        _model = State(initialValue: SettingsViewModel(environment: environment))
    }

    public var body: some View {
        Form {
            Section("Display") {
                Picker("Units", selection: $model.preferences.unitPreference) {
                    Text("As written").tag(UnitPreference.original)
                    Text("US").tag(UnitPreference.us)
                    Text("Metric").tag(UnitPreference.metric)
                }
                Toggle("Open recipes at a default serving count", isOn: defaultServingsEnabled)
                if let servings = model.preferences.defaultServings {
                    Stepper("\(servings) servings", value: defaultServings, in: 1...50)
                }
                Toggle("Suggest dietary tags", isOn: $model.preferences.dietarySuggestionsEnabled)
                Toggle("Group Library by folder", isOn: $model.preferences.groupLibraryByFolder)
            }

            Section {
                NavigationLink(value: Route.backups) {
                    LabeledContent("Backups", value: lastBackupText)
                }
                Toggle("Copy backups to iCloud Drive", isOn: $model.preferences.iCloudBackupEnabled)
                if let status = model.cloudStatus {
                    Text(cloudStatusText(status))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Data safety")
            } footer: {
                Text("Kitchen Buddy snapshots your recipe book automatically and verifies every copy. Backups also ride along in your device backup.")
            }

            Section {
                ForEach(HealthProfile.allCases, id: \.self) { profile in
                    Toggle(isOn: Binding(get: { model.preferences.enabledHealthProfiles.contains(profile) },
                                         set: { on in
                                             if on { model.preferences.enabledHealthProfiles.insert(profile) }
                                             else { model.preferences.enabledHealthProfiles.remove(profile) }
                                         })) {
                        Label {
                            VStack(alignment: .leading) {
                                Text(profile.title)
                                Text(profile.measureName + " per serving").font(.caption).foregroundStyle(.secondary)
                            }
                        } icon: { Image(systemName: profile.symbolName) }
                    }
                    .accessibilityIdentifier("healthToggle-\(profile.rawValue)")
                }
                NavigationLink(value: Route.healthSources) { Text("Sources & thresholds") }
                    .accessibilityIdentifier("healthSources")
            } header: {
                Text("Health")
            } footer: {
                Text("Each profile adds a badge to recipes, a filter chip to the Library, and a line-by-line worksheet on the recipe. Figures are estimates from typical ingredients in a bundled food table, per serving, using the servings you say you get. They are not medical advice.")
            }

            Section("Library") {
                Button("Import from File…") { model.environment.router.present(.importFile(nil)) }
                    .accessibilityIdentifier("importFromFile")
                Button("Export Full Backup…") { model.environment.router.present(.share(.all, backup: true)) }
                    .accessibilityIdentifier("exportFullBackup")
            }

            Section {
                Button("Rebuild Search Index") { Task { await model.rebuildSearchIndex() } }
                    .disabled(model.isBusy)
                Button("Reindex Spotlight") { Task { await model.reindexSpotlight() } }
                    .disabled(model.isBusy)
                    .accessibilityIdentifier("reindexSpotlight")
            } header: {
                Text("Search")
            } footer: {
                Text("In-app search runs on an index built from your recipes and kept up to date as you edit. Rebuild it if results ever look stale or a recipe is missing from search; it takes a moment and changes nothing else. Spotlight is the iPhone's Home-screen search — reindex if your recipes stop showing up there.")
            }

            if let feedback = model.feedbackURL {
                Section {
                    Link(destination: feedback) { Label("Send Feedback", systemImage: "envelope") }
                } footer: {
                    Text("TestFlight testers can also take a screenshot and use its Share sheet to send feedback with the picture attached.")
                }
            }

            if model.showsDeveloperOptions {
                Section {
                    Button("Load Sample Recipes") { Task { await model.loadSampleRecipes() } }
                        .disabled(!model.canLoadSamples)
                } header: {
                    Text("Samples")
                } footer: {
                    Text(model.recipeCount == 0
                         ? "Adds 34 sample recipes to an empty book. Debug and TestFlight builds only."
                         : "Available only while the book is empty (\(model.recipeCount) recipes now).")
                }
            }

            Section("About") {
                LabeledContent("Version", value: model.versionText)
                LabeledContent("Export format", value: model.formatVersion)
                LabeledContent("Food table", value: "v\(FoodTable.version) · \(FoodTable.foods.count) foods")
                LabeledContent("Recipes", value: "\(model.recipeCount)")
            }
        }
        .navigationTitle("Settings")
        .onChange(of: model.preferences) { model.save() }
        .task { model.refresh() }
        .onChange(of: model.environment.maintenanceGeneration) { model.refresh() }
        .overlay {
            if model.isBusy { ProgressView().controlSize(.large) }
        }
        .alert("Settings", isPresented: Binding(get: { model.message != nil }, set: { if !$0 { model.message = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.message ?? "")
        }
    }

    private var defaultServingsEnabled: Binding<Bool> {
        Binding(get: { model.preferences.defaultServings != nil },
                set: { model.preferences.defaultServings = $0 ? 4 : nil })
    }

    private var defaultServings: Binding<Int> {
        Binding(get: { model.preferences.defaultServings ?? 4 },
                set: { model.preferences.defaultServings = $0 })
    }

    private var lastBackupText: String {
        guard let last = model.lastBackup else { return "None yet" }
        return last.createdAt.formatted(.relative(presentation: .named))
    }

    private func cloudStatusText(_ status: CloudMirror.Status) -> String {
        guard status.isAvailable else { return status.unavailableReason ?? "iCloud is unavailable." }
        if let error = status.lastError { return "Last copy failed: \(error)" }
        if let date = status.lastCopiedAt {
            return "Last copied to iCloud \(date.formatted(.relative(presentation: .named)))."
        }
        return "iCloud Drive is available. Nothing copied yet."
    }
}

#Preview {
    NavigationStack { SettingsView(environment: .preview()) }
}
