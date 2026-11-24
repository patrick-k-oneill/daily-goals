import ExpoModulesCore

public class ZoomMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ZoomMenu")
    Events("zoom")

    OnStartObserving {
      ZoomMenu.shared.onZoom = { [weak self] direction in
        self?.sendEvent("zoom", ["direction": direction.rawValue])
      }
    }

    OnStopObserving {
      ZoomMenu.shared.onZoom = nil
    }

    Function("isSupported") { () -> Bool in
      ZoomMenu.isSupported
    }

    Function("setLimits") { (canZoomIn: Bool, canZoomOut: Bool) in
      DispatchQueue.main.async {
        ZoomMenu.shared.setLimits(canZoomIn: canZoomIn, canZoomOut: canZoomOut)
      }
    }
  }
}
