# Rill 音乐插件

插件 ID：`rill.music`。音乐界面、首页卡片、数据适配器及安卓服务全部位于此目录。

- `MusicPlayer.tsx`：完整播放器。
- `HomeCard.tsx`：首页控制卡片，与播放器共享 `runtime.tsx`。
- `native/`：独立 Tauri 插件 crate 及 Android library，负责后台媒体服务、媒体通知、音频焦点与桌面小组件。
- `native/commands.rs`：宿主调用边界；从多维表授权后的记录构建原生歌单，不接收任意文件 URI。

首页可移除或重新添加音乐模块。插件管理支持停用、卸载和重新安装。卸载会移除插件入口、停止音频、清除安卓原生歌单，并让已添加的桌面小组件显示插件不可用。桌面小组件由用户从系统桌面移除。

当前属于随发行版提供的可选插件：前端有独立构建入口 `dist/plugins/rill.music/index.js`，安卓代码以独立 library 编译进 APK。应用内卸载撤销注册并清理运行资源，不会从已签名 APK 中删除原生字节码，也不是单独安装的 APK。现有宿主还没有外部原生插件的动态装卸协议。

安卓播放器使用原生 MediaPlayer + MediaSession + mediaPlayback 前台服务，WebView 隐藏后无需 JavaScript 持续运行。桌面小组件直接调用服务，系统通知及锁屏控制共享同一会话。暂停会释放音频焦点；插拔耳机、失去焦点会暂停。强制停止应用仍服从 Android 系统行为。

## 验证

前端：TypeScript、音乐/首页同步及插件管理测试、生产构建、桌面与手机宽度视觉检查。安卓：需要 SDK 36、JDK、Rust Android target，以及 Tauri 生成的 Android 工程；已通过旧构建缓存中的工具链完成 ARM64 Rust、Kotlin、Android 资源与 APK 打包。设备测试尚未完成。需测试锁屏、切换应用、通知栏和桌面操作、来电/耳机、撤销目录授权、停用/卸载以及系统终止进程。


## 2026-10-11 界面调整

MusicPlayer.tsx 与 HomeCard.tsx 保留兼容导出，新实现分别为 ListeningPlayer.tsx（唱片播放器＋视图专辑／全表列表）和 CompactMusicCard.tsx（全宽横向窄条）。数据表与视图选择收入歌单设置；移除标题、宣传文案及添加桌面按钮。安卓桌面组件改用 rill_music_widget_compact 水平布局，默认目标 4×1。详细规则与测试见 ../../docs/music-listening-design.md。该轮修改未重新导出 APK。

## 统一 API 要求（2026-10-12）

所有插件必须通过统一公开 Host API 与 Rill 交互，无随附或原生插件例外。本文中的专用端口及内部宿主依赖仅记录现状，属于待迁移实现，不可作为新插件规范。后续开发遵守 [插件开发规范](../../docs/plugin-development.md) 和 [新插件设计模板](../../docs/plugin-design-template.md)，缺少能力先扩展通用 API。

## 2026-10-12 统一 Host API 2

本插件已使用统一公共 API，专用宿主数据入口不再调用。当前契约、通用状态表、旧设置迁移、外部消息协议及未实现能力见 [统一 Host API 2](../../docs/unified-host-api.md)。独立阅读器已构建 0.2.0 本地签名包，需要新版宿主；尚未发布远程版本或新 APK。