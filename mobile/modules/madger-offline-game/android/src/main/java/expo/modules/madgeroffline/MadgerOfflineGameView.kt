package expo.modules.madgeroffline

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import androidx.webkit.WebViewAssetLoader
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import org.json.JSONObject
import java.io.ByteArrayInputStream

/** The reviewed authored web game, served exclusively from this APK. No remote URL prop. */
@SuppressLint("SetJavaScriptEnabled", "ViewConstructor")
class MadgerOfflineGameView(context: Context, appContext: AppContext) : ExpoView(context, appContext), LifecycleEventListener {
  override val shouldUseAndroidLayout = true
  private val onMessage by EventDispatcher<Map<String, String>>()
  private val onError by EventDispatcher<Map<String, String>>()
  private val web = WebView(context)
  @Volatile private var initialStorageJson = "{}"
  private var storageReady = false
  private var started = false
  private var loaded = false
  private var disposed = false
  private var desiredActive = false
  private var lastBackRequest = 0
  private var foreground = true
  private val origin = "https://appassets.androidplatform.net"
  private val assetLoader = WebViewAssetLoader.Builder()
    .addPathHandler("/", WebViewAssetLoader.PathHandler { path -> asset(path) })
    .build()

  init {
    addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    web.setBackgroundColor(0xff071813.toInt())
    web.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      allowFileAccess = false
      allowContentAccess = false
      @Suppress("DEPRECATION")
      allowFileAccessFromFileURLs = false
      @Suppress("DEPRECATION")
      allowUniversalAccessFromFileURLs = false
      mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
      blockNetworkLoads = true
      javaScriptCanOpenWindowsAutomatically = false
      setSupportMultipleWindows(false)
      // The bundled game gates audio on explicit Start and stops it on pause/background.
      // Lazy-created footsteps must be playable after the initial touch gesture.
      mediaPlaybackRequiresUserGesture = false
      setGeolocationEnabled(false)
    }
    web.addJavascriptInterface(Bridge(), "MadgerNative")
    web.webChromeClient = object : WebChromeClient() {
      override fun onConsoleMessage(message: ConsoleMessage): Boolean {
        Log.i("MadgerOfflineGame", "${message.messageLevel()}: ${message.message().take(4096)}")
        return true
      }
    }
    web.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
        if (!local(request.url)) return response(403, "Blocked", "External resources are disabled")
        return assetLoader.shouldInterceptRequest(request.url) ?: response(404, "Missing", "Bundled resource missing")
      }
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url
        if (local(uri) && uri.path in listOf("/expedition", "/expedition.html")) return false
        if (request.isForMainFrame && local(uri) && uri.path in listOf("/", "/index.html", "/legacy", "/legacy.html")) {
          onMessage(mapOf("message" to "{\"type\":\"exit\"}"))
        }
        return true
      }
      override fun onPageFinished(view: WebView, url: String) {
        if (!local(Uri.parse(url))) return
        loaded = true
        syncLifecycle()
      }
      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
        if (request.isForMainFrame) fail("Offline game failed to load: ${error.description}")
      }
      override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: WebResourceResponse) {
        if (request.isForMainFrame) fail("Offline game document is unavailable (${errorResponse.statusCode}).")
      }
      override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        fail("The 3D graphics process stopped. Your last saved checkpoint is retained; reopen the game.")
        dispose()
        return true
      }
    }
    (appContext.reactContext as? ReactContext)?.addLifecycleEventListener(this)
  }

  private fun local(uri: Uri) = uri.scheme == "https" && uri.host == "appassets.androidplatform.net" && (uri.port == -1 || uri.port == 443)

  private fun asset(requested: String): WebResourceResponse {
    val path = Uri.decode(requested).trimStart('/')
    if (path.contains('\\') || path.contains('%') || path.contains('\u0000') || path.split('/').any { it == ".." || it == "." }) {
      return response(403, "Blocked", "Invalid asset path")
    }
    val file = when {
      path.isEmpty() -> "index.html"
      path.endsWith('/') -> path + "index.html"
      !path.substringAfterLast('/').contains('.') -> path + ".html"
      else -> path
    }
    val type = when (file.substringAfterLast('.').lowercase()) {
      "html" -> "text/html"
      "js", "mjs" -> "text/javascript"
      "css" -> "text/css"
      "json", "gltf" -> "application/json"
      "wasm" -> "application/wasm"
      "png" -> "image/png"
      "jpg", "jpeg" -> "image/jpeg"
      "webp" -> "image/webp"
      "svg" -> "image/svg+xml"
      "woff" -> "font/woff"
      "woff2" -> "font/woff2"
      "ttf" -> "font/ttf"
      "otf" -> "font/otf"
      "mp3" -> "audio/mpeg"
      "wav" -> "audio/wav"
      "ogg" -> "audio/ogg"
      else -> "application/octet-stream"
    }
    return try {
      val stream = context.assets.open("expedition/$file")
      WebResourceResponse(type, if (type.startsWith("text/") || type == "application/json") "UTF-8" else null, 200, "OK", mapOf(
        "Cache-Control" to "no-cache",
        "X-Content-Type-Options" to "nosniff",
        "Content-Security-Policy" to "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: data:; img-src 'self' blob: data:; media-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'"
      ), stream)
    } catch (_: Exception) { response(404, "Missing", "Bundled resource missing: $file") }
  }

  private fun response(status: Int, reason: String, message: String) = WebResourceResponse(
    "text/plain", "UTF-8", status, reason, mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(message.toByteArray(Charsets.UTF_8))
  )
  private fun fail(message: String) { if (!disposed) onError(mapOf("message" to message)) }

  fun setInitialStorage(value: String) {
    if (started || disposed) return
    try {
      require(value.length <= 2 * 1024 * 1024)
      val parsed = JSONObject(value)
      require(parsed.keys().asSequence().all { parsed.isNull(it) || parsed.get(it) is String })
      initialStorageJson = value
      storageReady = true
    } catch (_: Exception) { fail("Saved game data could not be transferred; existing records were not changed.") }
  }
  fun startIfReady() {
    if (started || disposed || !storageReady) return
    started = true
    web.loadUrl("$origin/expedition?nativeHost=1")
  }
  fun setGameActive(value: Boolean) { desiredActive = value; syncLifecycle() }
  private fun syncLifecycle() {
    if (!loaded || disposed) return
    val active = desiredActive && foreground
    if (active) web.onResume()
    web.evaluateJavascript("window.__madgerNativeActive=$active;window.dispatchEvent(new CustomEvent('madger-native-lifecycle',{detail:{active:$active}}));") {
      if (!disposed && !(desiredActive && foreground)) web.onPause()
    }
  }
  fun setBackRequest(value: Int) {
    if (value != lastBackRequest) { lastBackRequest = value; requestBack() }
  }
  fun requestBack() {
    if (loaded && !disposed) web.evaluateJavascript("window.dispatchEvent(new Event('madger-native-back'))", null)
  }
  override fun onHostPause() { foreground = false; syncLifecycle() }
  override fun onHostResume() { foreground = true; syncLifecycle() }
  override fun onHostDestroy() { dispose() }
  override fun onDetachedFromWindow() { foreground = false; syncLifecycle(); super.onDetachedFromWindow() }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); foreground = true; syncLifecycle() }
  fun dispose() {
    if (disposed) return
    disposed = true
    (appContext.reactContext as? ReactContext)?.removeLifecycleEventListener(this)
    web.stopLoading()
    web.removeJavascriptInterface("MadgerNative")
    removeView(web)
    web.destroy()
  }
  inner class Bridge {
    @JavascriptInterface fun getInitialStorage(): String = initialStorageJson
    @JavascriptInterface fun postMessage(message: String) {
      if (message.length > 2 * 1024 * 1024) return
      val allowed = try { JSONObject(message).optString("type") in setOf("storage", "exit", "diagnostic", "ready") } catch (_: Exception) { false }
      if (allowed) post { if (!disposed) onMessage(mapOf("message" to message)) }
    }
  }
}
