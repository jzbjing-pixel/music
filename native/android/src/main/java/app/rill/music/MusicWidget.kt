package app.rill.music
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import app.tauri.plugin.JSObject

class MusicWidget:AppWidgetProvider(){
 override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){update(context)}
 companion object {
  fun update(context:Context,state:JSObject?=PlaybackService.instance?.snapshot()){
   val manager=AppWidgetManager.getInstance(context);val ids=manager.getAppWidgetIds(ComponentName(context,MusicWidget::class.java));if(ids.isEmpty())return
   val enabled=context.getSharedPreferences("rill.music",0).getBoolean("enabled",true)
   val views=RemoteViews(context.packageName,R.layout.rill_music_widget_compact)
   views.setTextViewText(R.id.music_title,if(!enabled)"音乐已停用" else state?.optString("name")?.takeIf{it.isNotEmpty()}?.replace(Regex("\\.(mp3|wav|flac|m4a|aac|ogg|opus|wma)$",RegexOption.IGNORE_CASE),"")?:"未选择歌曲")
   views.setTextViewText(R.id.music_subtitle,if(!enabled)"Rill" else state?.optString("sourceName")?.takeIf{it.isNotEmpty()}?:"本地音乐")
   views.setImageViewResource(R.id.music_toggle,if(state?.optBoolean("playing")==true)R.drawable.rill_music_pause else R.drawable.rill_music_play)
   val duration=state?.optDouble("duration")?:0.0;val elapsed=state?.optDouble("elapsed")?:0.0
   val seconds=elapsed.toInt().coerceAtLeast(0);views.setTextViewText(R.id.music_elapsed,"${seconds/60}:${(seconds%60).toString().padStart(2,'0')}")
   views.setProgressBar(R.id.music_progress,1000,if(duration>0)(elapsed/duration*1000).toInt() else 0,false)
   val launch=context.packageManager.getLaunchIntentForPackage(context.packageName)?:Intent()
   val open=PendingIntent.getActivity(context,7300,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
   views.setOnClickPendingIntent(R.id.music_root,open);views.setOnClickPendingIntent(R.id.music_open,open)
   for((id,action) in listOf(R.id.music_previous to "previous",R.id.music_toggle to "toggle",R.id.music_next to "next")){
    val hasQueue=context.getSharedPreferences("rill.music",0).getString("queue","[]")!="[]"
    views.setOnClickPendingIntent(id,if(enabled && hasQueue)PendingIntent.getForegroundService(context,action.hashCode(),Intent(context,PlaybackService::class.java).setAction(action),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) else open)
    views.setBoolean(id,"setEnabled",true)
   }
   manager.updateAppWidget(ids,views)
  }
 }
}
