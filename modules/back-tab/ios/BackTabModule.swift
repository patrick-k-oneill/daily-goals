import ExpoModulesCore

public class BackTabModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackTab")
    Events("press")

    OnStartObserving {
      BackTab.shared.onPress = { [weak self] in
        self?.sendEvent("press")
      }
    }

    OnStopObserving {
      BackTab.shared.onPress = nil
    }
  }
}
