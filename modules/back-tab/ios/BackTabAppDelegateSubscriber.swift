import ExpoModulesCore
import UIKit

public class BackTabAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    BackTab.shared.install(on: application.delegate)
    return true
  }
}
