import UIKit

/// Receives Home-screen quick actions; the SwiftUI app watches
/// `shortcutType` and performs the action through the environment.
///
/// Requirements: kitchen-buddy-ios 19.4
final class AppDelegate: NSObject, UIApplicationDelegate, ObservableObject {
    @Published var shortcutType: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            shortcutType = item.type
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if let item = options.shortcutItem { shortcutType = item.type }
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        (UIApplication.shared.delegate as? AppDelegate)?.shortcutType = shortcutItem.type
        completionHandler(true)
    }
}
