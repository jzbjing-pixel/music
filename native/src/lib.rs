use tauri::{plugin::{Builder,TauriPlugin},Wry};
#[cfg(target_os="android")] use tauri::Manager;
#[cfg(target_os="android")] struct AndroidHandle(tauri::plugin::PluginHandle<Wry>);
pub fn init()->TauriPlugin<Wry>{Builder::new("rill-music").setup(|_app,_api|{
 #[cfg(target_os="android")] {let handle=_api.register_android_plugin("app.rill.music","MusicPlugin")?;_app.manage(AndroidHandle(handle));}
 Ok(())
}).build()}
pub fn call(_app:&tauri::AppHandle,_command:&str,_payload:serde_json::Value)->Result<serde_json::Value,String>{
 #[cfg(target_os="android")] {return _app.state::<AndroidHandle>().0.run_mobile_plugin(_command,_payload).map_err(|e|format!("音乐服务失败: {e}"));}
 #[cfg(not(target_os="android"))] Err("仅安卓支持系统音乐服务".into())
}
