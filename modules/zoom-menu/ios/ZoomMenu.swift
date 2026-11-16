import ObjectiveC
import UIKit

enum ZoomDirection: String {
  case zoomIn = "in"
  case zoomOut = "out"
}

final class ZoomMenu {
  static let shared = ZoomMenu()
  static let isSupported =
    ProcessInfo.processInfo.isiOSAppOnMac || ProcessInfo.processInfo.isMacCatalystApp

  private static let zoomInAction = Selector(("dailyGoalsZoomIn:"))
  private static let zoomOutAction = Selector(("dailyGoalsZoomOut:"))

  var onZoom: ((ZoomDirection) -> Void)?

  private var canZoomIn = true
  private var canZoomOut = true
  private var isInstalled = false

  func install(on appDelegate: UIApplicationDelegate?) {
    guard ZoomMenu.isSupported, !isInstalled,
      let appDelegate, let appDelegateClass = object_getClass(appDelegate)
    else { return }
    isInstalled = true
    addAction(ZoomMenu.zoomInAction, sending: .zoomIn, to: appDelegateClass)
    addAction(ZoomMenu.zoomOutAction, sending: .zoomOut, to: appDelegateClass)
    extendBuildMenu(of: appDelegateClass)
    UIMenuSystem.main.setNeedsRebuild()
  }

  func setLimits(canZoomIn: Bool, canZoomOut: Bool) {
    guard canZoomIn != self.canZoomIn || canZoomOut != self.canZoomOut else { return }
    self.canZoomIn = canZoomIn
    self.canZoomOut = canZoomOut
    UIMenuSystem.main.setNeedsRebuild()
  }

  private func build(with builder: UIMenuBuilder) {
    guard builder.system == .main else { return }
    builder.remove(menu: .textSize)
    let zoomIn = UIKeyCommand(
      title: "Zoom In",
      action: ZoomMenu.zoomInAction,
      input: "+",
      modifierFlags: .command,
      attributes: canZoomIn ? [] : .disabled
    )
    let zoomOut = UIKeyCommand(
      title: "Zoom Out",
      action: ZoomMenu.zoomOutAction,
      input: "-",
      modifierFlags: .command,
      attributes: canZoomOut ? [] : .disabled
    )
    builder.insertChild(
      UIMenu(title: "", options: .displayInline, children: [zoomIn, zoomOut]),
      atStartOfMenu: .view
    )
  }

  private func addAction(
    _ action: Selector, sending direction: ZoomDirection, to appDelegateClass: AnyClass
  ) {
    let send: @convention(block) (AnyObject, AnyObject?) -> Void = { [weak self] _, _ in
      self?.onZoom?(direction)
    }
    class_addMethod(appDelegateClass, action, imp_implementationWithBlock(send), "v@:@")
  }

  private func extendBuildMenu(of appDelegateClass: AnyClass) {
    typealias BuildMenu = @convention(c) (AnyObject, Selector, UIMenuBuilder) -> Void
    let buildMenu = #selector(UIResponder.buildMenu(with:))
    guard let current = class_getInstanceMethod(appDelegateClass, buildMenu) else { return }
    let original = unsafeBitCast(method_getImplementation(current), to: BuildMenu.self)
    let extended: @convention(block) (AnyObject, UIMenuBuilder) -> Void = {
      [weak self] appDelegate, builder in
      original(appDelegate, buildMenu, builder)
      self?.build(with: builder)
    }
    let implementation = imp_implementationWithBlock(extended)
    let isAdded = class_addMethod(
      appDelegateClass, buildMenu, implementation, method_getTypeEncoding(current))
    if !isAdded {
      method_setImplementation(current, implementation)
    }
  }
}
