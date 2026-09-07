import UIKit
import UniformTypeIdentifiers

/// Receives a web URL from the share sheet and queues it for the app.
///
/// The extension never parses and never touches the database (ADR-005): it
/// appends the URL to `pendingImportURLs` in the App Group defaults, shows a
/// one-line confirmation, and completes. The app drains the queue when it
/// becomes active and opens the import review editor.
final class ShareViewController: UIViewController {
    static let appGroup = "group.net.puddleglum.kitchenbuddy"
    static let queueKey = "pendingImportURLs"

    private let label = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        label.text = "Saving to Kitchen Buddy…"
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
        Task { await receiveURL() }
    }

    private func receiveURL() async {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem])?
            .flatMap { $0.attachments ?? [] } ?? []
        guard let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }),
              let url = try? await provider.loadURL()
        else {
            finish(message: "No web link found to import.")
            return
        }
        Self.enqueue(url)
        finish(message: "Saved. Open Kitchen Buddy to review and import\n\(url.host ?? url.absoluteString).")
    }

    static func enqueue(_ url: URL) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        var queue = defaults.stringArray(forKey: queueKey) ?? []
        if !queue.contains(url.absoluteString) { queue.append(url.absoluteString) }
        defaults.set(queue, forKey: queueKey)
    }

    private func finish(message: String) {
        label.text = message
        Task {
            try? await Task.sleep(for: .seconds(1.4))
            extensionContext?.completeRequest(returningItems: nil)
        }
    }
}

private extension NSItemProvider {
    func loadURL() async throws -> URL? {
        try await withCheckedThrowingContinuation { continuation in
            loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, error in
                if let error { continuation.resume(throwing: error); return }
                continuation.resume(returning: item as? URL)
            }
        }
    }
}
