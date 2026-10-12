import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { musicApi } from "../../src/data/music-api";
import {
  nextTrack,
  type MediaLease,
  type TableBinding,
} from "../../src/data/media";
import type { DataRecord, DataTable } from "../../src/data/model";
import { isAndroid, androidControl, androidQueue } from "./android";
const key = (r: DataRecord) => `${r.sourceId}:${r.id}`;
function useController(enabled: boolean) {
  const [tables, setTables] = useState<DataTable[]>([]),
    [binding, setBindingState] = useState<TableBinding>({tableId: ''});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [tracks, setTracks] = useState<DataRecord[]>([]),
    [current, setCurrent] = useState<DataRecord>();
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [opening, setOpening] = useState(false);
  const [shuffle, setShuffle] = useState(false),
    [repeat, setRepeat] = useState<"off" | "all" | "one">('off'),
    [revision, setRevision] = useState(0);
  const audio = useRef<HTMLAudioElement>(null),
    lease = useRef<MediaLease>(),
    request = useRef(0);
  const scopeKey = (scope: TableBinding) => `${scope.tableId}:${scope.viewId ?? ''}`;
  const [loadedScope, setLoadedScope] = useState('');
  const pendingPlay = useRef<{ binding: TableBinding; trackKey?: string }>();
  useEffect(() => {
    if (!enabled) { setSettingsLoaded(false); return; }
    let active = true;
    void musicApi.settings().then(settings => {
      if (!active) return;
      setBindingState(settings.binding ?? {tableId: ''});
      setShuffle(settings.shuffle === true);
      setRepeat(settings.repeat === 'all' || settings.repeat === 'one' ? settings.repeat : 'off');
      setSettingsLoaded(true);
    }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [enabled]);
  function setBinding(next: TableBinding) { pendingPlay.current = undefined; setBindingState(next); }
  function playFromScope(next: TableBinding, track?: DataRecord) {
    if (scopeKey(next) === scopeKey(binding) && loadedScope === scopeKey(next)) {
      const target = track ? tracks.find(item => key(item) === key(track)) : tracks[0];
      if (target) void play(target);
      return;
    }
    pendingPlay.current = { binding: next, trackKey: track ? key(track) : undefined };
    setBindingState(next);
  }
  function stop() {
    if (isAndroid)
      void androidControl("stop").catch((e) => setError(String(e)));
    request.current++;
    audio.current?.pause();
    audio.current?.removeAttribute("src");
    audio.current?.load();
    lease.current?.dispose();
    lease.current = undefined;
    setCurrent(undefined);
    setOpening(false);
  }
  useEffect(() => {
    if (!enabled) {
      stop();
      setTracks([]);
      return;
    }
    let alive = true;
    const player = audio.current;
    const refresh = () => {
      stop();
      setRevision((r) => r + 1);
    };
    void musicApi
      .tables()
      .then((next) => {
        if (alive) setTables(next);
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    window.addEventListener("rill:data-changed", refresh);
    return () => {
      alive = false;
      request.current++;
      player?.pause();
      player?.removeAttribute("src");
      player?.load();
      lease.current?.dispose();
      window.removeEventListener("rill:data-changed", refresh);
    };
  }, [enabled]);
  const firstScope = useRef(true);
  useEffect(() => {
    const abort = new AbortController();
    if (!enabled || !settingsLoaded) return () => abort.abort();
    if (!isAndroid || !firstScope.current) stop();
    firstScope.current = false;
    if (enabled && settingsLoaded) void musicApi.saveSettings({binding}).catch(e => setError(String(e)));
    setTracks([]);
    setLoadedScope('');
    setError("");
    setLoading(false);
    if (!enabled || !binding.tableId) return () => abort.abort();
    setLoading(true);
    void musicApi
      .tables()
      .then((next) => {
        if (!abort.signal.aborted) setTables(next);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(String(e));
      });
    void musicApi
      .query(binding, abort.signal)
      .then((next) => {
        if (!abort.signal.aborted) { setTracks(next); setLoadedScope(scopeKey(binding)); }
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [binding.tableId, binding.viewId, revision, enabled, settingsLoaded]);
  useEffect(() => {
    const pending = pendingPlay.current;
    if (!pending || loadedScope !== scopeKey(pending.binding) || loadedScope !== scopeKey(binding)) return;
    pendingPlay.current = undefined;
    const target = pending.trackKey ? tracks.find(track => key(track) === pending.trackKey) : tracks[0];
    if (target) void play(target);
  }, [loadedScope, tracks, binding.tableId, binding.viewId]);
  async function play(track: DataRecord) {
    if (isAndroid) {
      setOpening(true);
      setError("");
      try {
        await androidQueue(binding, tracks, track, shuffle, repeat);
        setCurrent(track);
      } catch (e) {
        setError(String(e));
      } finally {
        setOpening(false);
      }
      return;
    }
    stop();
    const id = ++request.current;
    setOpening(true);
    setError("");
    try {
      const next = await musicApi.open(binding, track);
      if (id !== request.current) {
        next.dispose();
        return;
      }
      lease.current = next;
      setCurrent(track);
      const element = audio.current!;
      element.src = next.url;
      element.load();
      try {
        await element.play();
      } catch {
        if (id === request.current)
          setError("请点击播放控件开始播放；若仍无法播放，请检查文件格式。");
      }
    } catch (e) {
      if (id === request.current)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === request.current) setOpening(false);
    }
  }

  const table = tables.find((t) => t.id === binding.tableId);
  function advance(direction: number, ended = false) {
    if (isAndroid) {
      void androidControl(direction > 0 ? "next" : "previous").catch((e) =>
        setError(String(e)),
      );
      return;
    }
    if (ended && repeat === "one" && audio.current) {
      audio.current.currentTime = 0;
      void audio.current.play().catch(() => setError("请点击播放控件继续播放"));
      return;
    }
    const next = nextTrack(
      tracks,
      current ? key(current) : "",
      direction,
      shuffle,
      repeat === "all",
    );
    if (next) void play(next);
  }

  const [playing, setPlaying] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [duration, setDuration] = useState(0);
  function toggle() {
    if (isAndroid) {
      if (!current && tracks[0]) void play(tracks[0]);
      else void androidControl("toggle").catch((e) => setError(String(e)));
      return;
    }
    const player = audio.current;
    if (!player) return;
    if (!current) {
      advance(1);
      return;
    }
    if (player.paused)
      void player.play().catch(() => setError("请重新选择歌曲开始播放"));
    else player.pause();
  }
  function seek(value: number) {
    if (isAndroid) {
      void androidControl("seek", { position: Math.floor(value * 1000) }).catch(
        (e) => setError(String(e)),
      );
      return;
    }
    if (audio.current && Number.isFinite(value))
      audio.current.currentTime = value;
  }
  useEffect(() => {
    if (!isAndroid || !enabled) return;
    let alive = true,
      pending = false;
    const sync = async () => {
      if (pending) return;
      pending = true;
      try {
        const state = await androidControl("state");
        if (!alive) return;
        setPlaying(state.playing);
        setElapsed(state.elapsed);
        setDuration(state.duration);
        setError(state.error ?? "");
        setCurrent(
          tracks.find(
            (t) => t.id === state.id && t.sourceId === state.sourceId,
          ) ??
            (state.id
              ? {
                  id: state.id,
                  sourceId: state.sourceId ?? "",
                  name: state.name ?? "",
                  sourceName: state.sourceName ?? "",
                  path: "",
                  size: 0,
                  modified: 0,
                  properties: {},
                }
              : undefined),
        );
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        pending = false;
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled, tracks]);
  useEffect(() => {
    if (enabled && settingsLoaded) void musicApi.saveSettings({shuffle, repeat}).catch(e => setError(String(e)));
    if (isAndroid && enabled && settingsLoaded)
      void androidControl("mode", { shuffle, repeat }).catch((e) =>
        setError(String(e)),
      );
  }, [enabled, settingsLoaded, shuffle, repeat]);
  return {
    tables,
    binding,
    setBinding,
    tracks,
    current,
    error,
    loading,
    opening,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    setRevision,
    stop,
    play,
    playFromScope,
    advance,
    table,
    playing,
    elapsed,
    duration,
    toggle,
    seek,
    element: isAndroid ? null : (
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setElapsed(audio.current?.currentTime ?? 0)}
        onLoadedMetadata={() =>
          setDuration(
            Number.isFinite(audio.current?.duration)
              ? audio.current!.duration
              : 0,
          )
        }
        onEmptied={() => {
          setPlaying(false);
          setElapsed(0);
          setDuration(0);
        }}
        onEnded={() => advance(1, true)}
        onError={() => {
          if (audio.current?.getAttribute("src"))
            setError("无法播放此音频，请检查文件格式或编码。");
        }}
      />
    ),
  };
}
const Playback = createContext<ReturnType<typeof useController> | null>(null);
export function MusicProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const state = useController(enabled);
  return (
    <Playback.Provider value={state}>
      {state.element}
      {children}
    </Playback.Provider>
  );
}
export function useMusic() {
  const state = useContext(Playback);
  if (!state) throw Error("音乐插件未启动");
  return state;
}
