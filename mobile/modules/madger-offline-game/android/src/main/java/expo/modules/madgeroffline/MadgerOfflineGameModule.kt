package expo.modules.madgeroffline

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MadgerOfflineGameModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MadgerOfflineGame")
    View(MadgerOfflineGameView::class) {
      Events("onMessage", "onError")
      Prop("active") { view: MadgerOfflineGameView, active: Boolean -> view.setGameActive(active) }
      Prop("initialStorage") { view: MadgerOfflineGameView, value: String -> view.setInitialStorage(value) }
      Prop("backRequest") { view: MadgerOfflineGameView, request: Int -> view.setBackRequest(request) }
      OnViewDidUpdateProps { view: MadgerOfflineGameView -> view.startIfReady() }
      AsyncFunction("requestBack") { view: MadgerOfflineGameView -> view.requestBack() }
      OnViewDestroys { view: MadgerOfflineGameView -> view.dispose() }
    }
  }
}
