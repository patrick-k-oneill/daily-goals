import ObjectiveC
import UIKit

final class BackTab {
  static let shared = BackTab()

  private static let pressAction = Selector(("dailyGoalsBackTab:"))

  var onPress: (() -> Void)?

  private var isInstalled = false

  func install(on appDelegate: UIApplicationDelegate?) {
    guard !isInstalled, let appDelegate, let appDelegateClass = object_getClass(appDelegate)
    else { return }
    isInstalled = true
    addPressAction(to: appDelegateClass)
    extendKeyCommands(of: appDelegateClass)
  }

  private var keyCommands: [UIKeyCommand] {
    guard onPress != nil else { return [] }
    let backTab = UIKeyCommand(input: "\t", modifierFlags: .shift, action: BackTab.pressAction)
    backTab.wantsPriorityOverSystemBehavior = true
    return [backTab]
  }

  private func addPressAction(to appDelegateClass: AnyClass) {
    let send: @convention(block) (AnyObject, AnyObject?) -> Void = { [weak self] _, _ in
      self?.onPress?()
    }
    class_addMethod(
      appDelegateClass, BackTab.pressAction, imp_implementationWithBlock(send), "v@:@")
  }

  private func extendKeyCommands(of appDelegateClass: AnyClass) {
    typealias KeyCommands = @convention(c) (AnyObject, Selector) -> NSArray?
    let keyCommands = #selector(getter: UIResponder.keyCommands)
    guard let current = class_getInstanceMethod(appDelegateClass, keyCommands) else { return }
    let original = unsafeBitCast(method_getImplementation(current), to: KeyCommands.self)
    let extended: @convention(block) (AnyObject) -> NSArray? = { [weak self] appDelegate in
      let inherited = original(appDelegate, keyCommands) as? [UIKeyCommand] ?? []
      return (inherited + (self?.keyCommands ?? [])) as NSArray
    }
    let implementation = imp_implementationWithBlock(extended)
    let isAdded = class_addMethod(
      appDelegateClass, keyCommands, implementation, method_getTypeEncoding(current))
    if !isAdded {
      method_setImplementation(current, implementation)
    }
  }
}
