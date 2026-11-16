import ExpoModulesCore
import UIKit

public class ZoomMenuAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    ZoomMenu.shared.install(on: application.delegate)
    return true
  }
}
