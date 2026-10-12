# Rill 音乐播放器插件

音乐插件源码仓库，插件 ID 为 `rill.music`，当前源码版本为 `0.1.5`。

包含播放器、首页音乐控制卡片、共享播放状态、数据适配器，以及 Android 媒体前台服务、系统通知和桌面小组件。

## 接入 Rill

源码对应 Rill 宿主项目的 `plugins/music/` 目录。前端依赖 React 18.3.1、Rill 的公开 Host API 2 适配器及宿主 UI；现有相对导入要求将此仓库放在宿主的 `plugins/music/` 路径。`index.ts` 导出播放器、首页卡片和共享播放 Provider。

`native/` 是独立 Tauri 插件 crate，Android library 与 Rill 宿主一起构建。宿主已有构建脚本负责前端入口及 Android 集成。

本仓库上传的是源码，尚未发布可直接安装的签名 ZIP 或 GitHub Release。当前 Android 原生模块仍随 Rill APK 编译，应用内卸载撤销注册并停止运行资源，不能从已签名 APK 中动态删除原生字节码。

## 开发说明

- [实现与设备验证说明](docs/implementation.md)

宿主插件规范和 API 文档请在 Rill 宿主项目中查看，本仓库仅包含音乐插件自身的源码和说明。

前端及 Android 编译验证在 Rill 宿主中进行；锁屏播放、通知栏、音频焦点和桌面小组件仍需真机验证。
