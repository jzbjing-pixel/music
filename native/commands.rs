use crate::kernel::Shared;
use tauri::State;
use rill_core::Result;
#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Track { source_id:String, id:String }
#[tauri::command]
pub async fn music_queue(state:State<'_,Shared>,table_id:String,view_id:Option<String>,tracks:Vec<Track>,current:usize,shuffle:bool,repeat:String,actor:Option<String>)->Result<()> {
 let shared=state.inner().clone();let actor=actor.unwrap_or_else(||"rill.music".into());tauri::async_runtime::spawn_blocking(move||{
  if tracks.is_empty() || tracks.len()>10000 || current>=tracks.len(){return Err("歌单无效（最多 10000 首）".into())}
  let _operation=shared.operation.lock().map_err(|_|"音乐操作暂不可用")?;
  let index=shared.index.lock().map_err(|_|"索引暂不可用")?;
  crate::plugin_api::authorize(&shared.data,&index,&actor,"media.playback")?;
  let config:serde_json::Value=index.get("data_config")?.ok_or("表配置不存在")?;
  let roots=index.roots()?;let errors:std::collections::BTreeMap<String,String>=index.get("data_source_errors")?.unwrap_or_default();
  let mut queue=Vec::new();
  for track in tracks {
   let root=roots.iter().find(|r|r.id==track.source_id).ok_or("音乐来源已不存在")?;
   if errors.contains_key(&root.id){return Err("音乐来源离线，请刷新目录".into())}
   let note=index.note(root,&track.id)?;
   rill_core::media::authorize_audio(&config,&table_id,view_id.as_deref(),root,&note)?;
   queue.push(serde_json::json!({"root":root.locator,"id":note.id,"sourceId":root.id,"name":note.name,"sourceName":root.name}));
  }
  drop(index);
  tauri_plugin_rill_music::call(&shared.app,"playback",serde_json::json!({"action":"queue","queue":serde_json::to_string(&queue).map_err(|_|"歌单编码失败")?,"index":current,"shuffle":shuffle,"repeat":repeat}))?;Ok(())
 }).await.map_err(|_|"音乐任务失败")?
}
#[tauri::command]
pub async fn music_playback(state:State<'_,Shared>,action:String,position:Option<u64>,shuffle:Option<bool>,repeat:Option<String>,actor:Option<String>)->Result<serde_json::Value>{
 let shared=state.inner().clone();let actor=actor.unwrap_or_else(||"rill.music".into());tauri::async_runtime::spawn_blocking(move||{
  if !["state","pin","toggle","next","previous","seek","mode","stop"].contains(&action.as_str()){return Err("未知播放操作".into())}
  let index=shared.index.lock().map_err(|_|"索引暂不可用")?;
  crate::plugin_api::authorize(&shared.data,&index,&actor,"media.playback")?;
  drop(index);
  tauri_plugin_rill_music::call(&shared.app,"playback",serde_json::json!({"action":action,"position":position.unwrap_or(0),"shuffle":shuffle.unwrap_or(false),"repeat":repeat.unwrap_or_else(||"off".into())}))
 }).await.map_err(|_|"音乐任务失败")?
}
