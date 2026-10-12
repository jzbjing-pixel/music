package app.rill.music
import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONArray

@InvokeArg class PlaybackArgs { var action: String = "state"; var queue: String = "[]"; var index: Int = 0; var position: Long = 0; var shuffle: Boolean = false; var repeat: String = "off"; var enabled: Boolean = true }
@TauriPlugin class MusicPlugin(private val activity: Activity): Plugin(activity) {
 @Command fun playback(invoke: Invoke) {
  val args = invoke.parseArgs(PlaybackArgs::class.java)
  activity.runOnUiThread {
   try {
    val prefs=activity.getSharedPreferences("rill.music",0)
    when(args.action) {
     "state" -> { invoke.resolve(PlaybackService.instance?.snapshot() ?: JSObject().put("playing",false).put("index",-1).put("elapsed",0).put("duration",0).put("error","")); return@runOnUiThread }
     "enabled" -> {
      prefs.edit().putBoolean("enabled",args.enabled).apply()
      if (!args.enabled) { PlaybackService.instance?.shutdown(); activity.stopService(Intent(activity,PlaybackService::class.java)); prefs.edit().remove("queue").apply() }
      MusicWidget.update(activity); invoke.resolve(); return@runOnUiThread
     }
     "mode" -> { prefs.edit().putBoolean("shuffle",args.shuffle).putString("repeat",args.repeat).apply(); PlaybackService.instance?.setModes(args.shuffle,args.repeat); invoke.resolve(); return@runOnUiThread }
     "pin" -> { val manager=AppWidgetManager.getInstance(activity); if (!manager.isRequestPinAppWidgetSupported) error("当前桌面不支持直接添加，请从桌面小组件列表添加"); manager.requestPinAppWidget(ComponentName(activity,MusicWidget::class.java),null,null); invoke.resolve(); return@runOnUiThread }
    }
    require(prefs.getBoolean("enabled",true)) { "音乐播放器已停用" }
    if (args.action=="queue") { val queue=JSONArray(args.queue); require(queue.length() in 1..10000); require(args.index in 0 until queue.length()); prefs.edit().putString("queue",queue.toString()).apply() }
    require(args.action in listOf("queue","toggle","next","previous","seek","mode","stop"))
    if (args.action=="stop") { prefs.edit().remove("queue").apply(); PlaybackService.instance?.shutdown(); activity.stopService(Intent(activity,PlaybackService::class.java)); invoke.resolve(); return@runOnUiThread }
    val intent=Intent(activity,PlaybackService::class.java).setAction(args.action).putExtra("index",args.index).putExtra("position",args.position).putExtra("shuffle",args.shuffle).putExtra("repeat",args.repeat)
    activity.startForegroundService(intent); invoke.resolve()
   } catch(e:Exception) { invoke.reject(e.message ?: "音乐服务失败") }
  }
 }
}
