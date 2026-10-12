import { musicHostApi } from '../../src/plugin-api';
export const isAndroid=!!(window as Window & {__TAURI_INTERNALS__?:unknown}).__TAURI_INTERNALS__ && /Android/i.test(navigator.userAgent);
export const androidControl=musicHostApi.media.playback;
export const androidQueue=musicHostApi.media.queue;
