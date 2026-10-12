package app.rill.music
import android.app.*
import android.content.*
import android.media.*
import android.media.session.*
import android.net.Uri
import android.os.*
import android.provider.DocumentsContract
import app.tauri.plugin.JSObject
import org.json.JSONArray
import org.json.JSONObject

class PlaybackService: Service() {
 companion object { var instance: PlaybackService? = null; private const val CHANNEL="rill.music.playback"; private const val NOTIFICATION=7301 }
 private var player: MediaPlayer?=null
 private lateinit var session: MediaSession
 private lateinit var audioManager: AudioManager
 private lateinit var focus: AudioFocusRequest
 private val handler=Handler(Looper.getMainLooper())
 private var queue=JSONArray(); private var index=-1; private var prepared=false; private var preparing=false; private var error=""; private var shuffle=false; private var repeat="off"
 private val attributes=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
 private val ticker=object:Runnable { override fun run(){ publish(false); handler.postDelayed(this,1000) } }
 override fun onCreate() {
  super.onCreate(); instance=this
  val prefs=getSharedPreferences("rill.music",0);shuffle=prefs.getBoolean("shuffle",false);repeat=prefs.getString("repeat","off")?:"off"
  getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CHANNEL,"音乐播放",NotificationManager.IMPORTANCE_LOW))
  audioManager=getSystemService(AudioManager::class.java)
  focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes).setWillPauseWhenDucked(true).setOnAudioFocusChangeListener { change -> if(change<0) pause() }.build()
  session=MediaSession(this,"Rill music").apply {
   setSessionActivity(openApp())
   setCallback(object:MediaSession.Callback(){ override fun onPlay(){ resume() }; override fun onPause(){ pause() }; override fun onSkipToNext(){ advance(1) }; override fun onSkipToPrevious(){ advance(-1) }; override fun onSeekTo(pos:Long){ seek(pos) }; override fun onStop(){ shutdown(); stopSelf() } })
   isActive=true
  }
  if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),Context.RECEIVER_NOT_EXPORTED) else registerReceiver(noisy,IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
  handler.post(ticker)
 }
 private val noisy=object:BroadcastReceiver(){ override fun onReceive(context:Context,intent:Intent){ pause() } }
 override fun onBind(intent:Intent?):IBinder?=null
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  startForeground(NOTIFICATION,notification())
  if (!getSharedPreferences("rill.music",0).getBoolean("enabled",true)) { shutdown(); stopSelf(); return START_NOT_STICKY }
  try {
   if (queue.length()==0 || intent?.action=="queue") queue=JSONArray(getSharedPreferences("rill.music",0).getString("queue","[]"))
   when(intent?.action) {
    "queue" -> { shuffle=intent.getBooleanExtra("shuffle",false);repeat=intent.getStringExtra("repeat")?:"off";load(intent.getIntExtra("index",0)) }
    "toggle" -> if(player?.isPlaying==true) pause() else resume()
    "next" -> advance(1)
    "previous" -> advance(-1)
    "seek" -> seek(intent.getLongExtra("position",0))
    "mode" -> { shuffle=intent.getBooleanExtra("shuffle",false);repeat=intent.getStringExtra("repeat")?:"off";publish() }
    else -> { shutdown();stopSelf() }
   }
  } catch(e:Exception) { fail(e.message?:"播放失败") }
  if(player?.isPlaying!=true && !preparing)stopForeground(STOP_FOREGROUND_DETACH)
  return START_NOT_STICKY
 }
 fun setModes(nextShuffle:Boolean,nextRepeat:String){shuffle=nextShuffle;repeat=nextRepeat;publish()}
 private fun load(next:Int) {
  if(next !in 0 until queue.length()) { pause(); return }
  player?.release();player=null;prepared=false;preparing=true;error="";index=next
  val item=queue.getJSONObject(index);val root=Uri.parse(item.getString("root"));require(root.scheme=="content" && DocumentsContract.isTreeUri(root))
  require(contentResolver.persistedUriPermissions.any { it.uri==root && it.isReadPermission }) { "目录授权已失效，请在 Rill 重新连接" }
  val uri=DocumentsContract.buildDocumentUriUsingTree(root,item.getString("id"))
  val parent=DocumentsContract.buildDocumentUriUsingTree(root,DocumentsContract.getTreeDocumentId(root))
  require(DocumentsContract.isChildDocument(contentResolver,parent,uri)) { "音乐已不在授权目录内" }
  val nextPlayer=MediaPlayer();player=nextPlayer
  nextPlayer.setAudioAttributes(attributes);nextPlayer.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK)
  nextPlayer.setOnPreparedListener { if(player===it){ preparing=false;prepared=true;resume() } }
  nextPlayer.setOnCompletionListener { if(player!==it)return@setOnCompletionListener; if(repeat=="one") {it.seekTo(0);resume()} else advance(1,true) }
  nextPlayer.setOnErrorListener { failed,_,_ -> if(player!==failed)return@setOnErrorListener true; fail("无法播放此音频，请检查文件格式和目录授权");true }
  nextPlayer.setDataSource(this,uri);nextPlayer.prepareAsync();publish()
 }
 private fun resume() {
  try {
   if (queue.length()==0) { pause(); return }
   if (!prepared) { if (!preparing) load(if(index<0)0 else index); return }
   // Android 15+ requires a foreground service before requesting audio focus.
   startForeground(NOTIFICATION,notification())
   if(audioManager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){fail("其他应用正在使用音频，请稍后播放");return}
   player?.start();publish()
  } catch(e:Exception){fail(e.message?:"无法开始播放")}
 }
 private fun pause() { if(prepared) player?.pause(); audioManager.abandonAudioFocusRequest(focus);publish();stopForeground(STOP_FOREGROUND_DETACH) }
 private fun seek(value:Long) { if(prepared) { player?.seekTo(value.coerceIn(0,(player?.duration?:0).toLong()),MediaPlayer.SEEK_CLOSEST);publish() } }
 private fun advance(direction:Int,ended:Boolean=false) {
  try {
   if(queue.length()==0){pause();return}
   var next=if(index<0)0 else index+direction
   if(shuffle && queue.length()>1){val choices=(0 until queue.length()).filter{it!=index};next=choices.random()}
   if(next !in 0 until queue.length()){if(repeat=="all")next=(next+queue.length())%queue.length() else {if(ended)pause();return}}
   load(next)
  } catch(e:Exception){fail(e.message?:"无法切换歌曲")}
 }
 private fun fail(message:String){error=message;preparing=false;prepared=false;player?.release();player=null;audioManager.abandonAudioFocusRequest(focus);publish();stopForeground(STOP_FOREGROUND_DETACH)}
 fun snapshot():JSObject { val song=if(index in 0 until queue.length())queue.getJSONObject(index) else JSONObject();return JSObject().put("playing",player?.isPlaying==true).put("index",index).put("id",song.optString("id")).put("sourceId",song.optString("sourceId")).put("name",song.optString("name")).put("sourceName",song.optString("sourceName")).put("elapsed",if(prepared)(player?.currentPosition?:0)/1000.0 else 0.0).put("duration",if(prepared)(player?.duration?:0)/1000.0 else 0.0).put("error",error) }
 private fun publish(notify:Boolean=true) {
  val state=snapshot(); val playing=state.optBoolean("playing")
  session.setPlaybackState(PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_SEEK_TO or PlaybackState.ACTION_STOP).setState(if(playing)PlaybackState.STATE_PLAYING else if(preparing)PlaybackState.STATE_BUFFERING else PlaybackState.STATE_PAUSED,(state.optDouble("elapsed")*1000).toLong(),if(playing)1f else 0f).build())
  session.setMetadata(MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,state.optString("name","Rill 音乐")).putString(MediaMetadata.METADATA_KEY_ARTIST,state.optString("sourceName")).putLong(MediaMetadata.METADATA_KEY_DURATION,(state.optDouble("duration")*1000).toLong()).build())
  if(notify)getSystemService(NotificationManager::class.java).notify(NOTIFICATION,notification())
  MusicWidget.update(this,state)
 }
 private fun openApp():PendingIntent { val intent=packageManager.getLaunchIntentForPackage(packageName)?:Intent();return PendingIntent.getActivity(this,7300,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
 private fun action(name:String):PendingIntent=PendingIntent.getForegroundService(this,name.hashCode(),Intent(this,PlaybackService::class.java).setAction(name),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
 private fun notification():Notification { val song=if(index in 0 until queue.length())queue.getJSONObject(index) else JSONObject();return Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(song.optString("name","Rill 音乐")).setContentText(error.ifEmpty {song.optString("sourceName","本地音乐")}).setContentIntent(openApp()).setOnlyAlertOnce(true).setOngoing(player?.isPlaying==true).addAction(Notification.Action.Builder(android.R.drawable.ic_media_previous,"上一首",action("previous")).build()).addAction(Notification.Action.Builder(if(player?.isPlaying==true)android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,if(player?.isPlaying==true)"暂停" else "播放",action("toggle")).build()).addAction(Notification.Action.Builder(android.R.drawable.ic_media_next,"下一首",action("next")).build()).setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0,1,2)).build() }
 fun shutdown(){player?.release();player=null;prepared=false;preparing=false;index=-1;queue=JSONArray();error="";audioManager.abandonAudioFocusRequest(focus);publish(false);stopForeground(STOP_FOREGROUND_REMOVE)}
 override fun onDestroy(){shutdown();handler.removeCallbacksAndMessages(null);unregisterReceiver(noisy);session.release();instance=null;super.onDestroy()}
}
