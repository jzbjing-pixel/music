import { useEffect, useRef, useState } from "react";
import type { ShellPageProps } from "../../src/modules/contracts";
import type { DataRecord } from "../../src/data/model";
import { Icon } from "../../src/icons";
import { Modal } from "../../src/ui/components";
import { musicApi } from "../../src/data/music-api";
import { useMusic } from "./runtime";
import { MusicGlyph, musicTime, songTitle, songArtist } from "./MusicVisuals";
import "./listening.css";
const key = (track: DataRecord) => `${track.sourceId}:${track.id}`;
const colors = ["var(--surface)"];

export default function ListeningPlayer({
  onNavigate,
}: Pick<ShellPageProps, "onNavigate">) {
  const {
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
    playFromScope,
    advance,
    table,
    playing,
    elapsed,
    duration,
    toggle,
    seek,
  } = useMusic();
  const [settings, setSettings] = useState(false);
  const [mode, setMode] = useState<"views" | "list">('views');
  const [displayLoaded, setDisplayLoaded] = useState(false);
  useEffect(() => { let active = true; void musicApi.settings().then(settings => { if (active) { setMode(settings.display === 'list' ? 'list' : 'views'); setDisplayLoaded(true); } }).catch(e => { if (active) setListError(String(e)); }); return () => {active = false;}; }, []);
  const [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false);
  const [allTracks, setAllTracks] = useState<DataRecord[]>([]),
    [listLoading, setListLoading] = useState(false),
    [listError, setListError] = useState(""),
    [libraryRevision, setLibraryRevision] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (displayLoaded) void musicApi.saveSettings({display: mode}).catch(e => setListError(String(e)));
    setQuery("");
  }, [mode, displayLoaded]);
  useEffect(() => {
    const refresh = () => setLibraryRevision((r) => r + 1);
    window.addEventListener("rill:data-changed", refresh);
    return () => window.removeEventListener("rill:data-changed", refresh);
  }, []);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const abort = new AbortController();
    if (mode !== "list" || !binding.tableId) {
      setListLoading(false);
      return;
    }
    setAllTracks([]);
    setListLoading(true);
    setListError("");
    // Display the entire table's global result without changing the active playback queue.
    void musicApi
      .query({ tableId: binding.tableId }, abort.signal)
      .then((rows) => {
        if (!abort.signal.aborted) setAllTracks(rows);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setListError(String(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setListLoading(false);
      });
    return () => abort.abort();
  }, [mode, binding.tableId, libraryRevision]);
  const displayTrack = current ?? tracks[0];
  const visible = allTracks.filter((track) =>
    `${track.name} ${songArtist(track)}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const albums = (table?.views ?? []).filter((view) =>
    view.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const activeView = table?.views.find((view) => view.id === binding.viewId);
  return (
    <section
      className="music-workspace listening-workspace"
      aria-label="音乐播放器"
    >
      <section
        className="music-player-card listening-hero"
        aria-label="当前播放"
      >
        <div className="listening-details">
          <p className="listening-artist">
            {opening ? "正在加载音频…" : songArtist(displayTrack)}
          </p>
          <h2 className="listening-title">{songTitle(displayTrack)}</h2>
          <div className="listening-progress">
            <input
              type="range"
              aria-label="播放进度"
              min={0}
              max={duration || 0}
              value={Math.min(elapsed, duration)}
              disabled={!duration}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <div>
              <span>{musicTime(elapsed)}</span>
              <span>{musicTime(duration)}</span>
            </div>
          </div>
          <div className="listening-transport">
            <button
              className="listening-mode"
              aria-label="随机播放"
              title="随机播放"
              aria-pressed={shuffle}
              onClick={() => setShuffle(!shuffle)}
            >
              <MusicGlyph name="shuffle" />
            </button>
            <div className="listening-main-controls">
              <button
                aria-label="上一首"
                title="上一首"
                disabled={!tracks.length || opening}
                onClick={() => advance(-1)}
              >
                <MusicGlyph name="previous" />
              </button>
              <button
                className="listening-play"
                aria-label={playing ? "暂停" : "播放"}
                title={playing ? "暂停" : "播放"}
                disabled={!tracks.length || opening}
                onClick={toggle}
              >
                <MusicGlyph name={playing ? "pause" : "play"} />
              </button>
              <button
                aria-label="下一首"
                title="下一首"
                disabled={!tracks.length || opening}
                onClick={() => advance(1)}
              >
                <MusicGlyph name="next" />
              </button>
            </div>
            <button
              className="listening-mode"
              aria-label={
                repeat === "off"
                  ? "开启列表循环"
                  : repeat === "all"
                    ? "切换单曲循环"
                    : "关闭循环"
              }
              title={
                repeat === "off"
                  ? "不循环"
                  : repeat === "all"
                    ? "列表循环"
                    : "单曲循环"
              }
              aria-pressed={repeat !== "off"}
              onClick={() =>
                setRepeat(
                  repeat === "off" ? "all" : repeat === "all" ? "one" : "off",
                )
              }
            >
              <MusicGlyph name="repeat" />
              {repeat === "one" && <sup>1</sup>}
            </button>
          </div>
        </div>
        <div
          className={`listening-record${playing ? " is-playing" : ""}`}
          aria-hidden="true"
        >
          <div className="listening-record-grooves">
            <div className="listening-record-label">
              <span>rill</span>
              <i />
            </div>
          </div>
        </div>
      </section>
      {error && (
        <p className="reader-warning" role="alert">
          {error}
        </p>
      )}
      <section className="listening-library" aria-label="歌单">
        <div className="music-list-head listening-library-head">
          <h3>
            {mode === "views" ? "专辑" : "歌曲"}{" "}
            <small>
              {mode === "views" ? (table?.views.length ?? 0) : allTracks.length}
            </small>
          </h3>
          <div className="listening-library-tools">
            <button
              className="listening-tool"
              aria-label={mode === "views" ? "切换列表模式" : "切换视图模式"}
              title={mode === "views" ? "列表模式" : "视图模式"}
              onClick={() => setMode(mode === "views" ? "list" : "views")}
            >
              <MusicGlyph name={mode === "views" ? "list" : "grid"} />
              <span>{mode === "views" ? "列表" : "视图"}</span>
            </button>
            <button
              className="listening-tool"
              aria-label="搜索歌单"
              title="搜索"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Icon name="search" size={18} />
            </button>
            <button
              className="listening-tool"
              aria-label="歌单设置"
              title="选择音乐数据表与视图"
              onClick={() => setSettings(true)}
            >
              <Icon name="more" size={20} />
            </button>
          </div>
        </div>
        {searchOpen && (
          <label className="listening-search">
            <Icon name="search" size={17} />
            <input
              ref={searchRef}
              aria-label="搜索歌曲"
              placeholder={mode === "views" ? "搜索专辑" : "搜索歌曲"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        {!binding.tableId ? (
          <div className="music-empty listening-empty">
            <p>还没有选择歌单。</p>
            <button className="text-button" onClick={() => setSettings(true)}>
              选择歌单来源 <Icon name="arrow" size={15} />
            </button>
          </div>
        ) : mode === "views" ? (
          <div className="music-album-grid">
            {albums.map((view, index) => (
              <button
                className={`music-album${binding.viewId === view.id ? " is-selected" : ""}`}
                key={view.id}
                aria-label={`播放专辑：${view.name}`}
                onClick={() =>
                  playFromScope({ tableId: binding.tableId, viewId: view.id })
                }
              >
                <span
                  className="music-album-cover"
                  style={{ background: colors[index % colors.length] }}
                >
                  <span className="music-album-record">
                    <span>{view.name.slice(0, 2)}</span>
                  </span>
                  <span className="music-album-play">
                    <MusicGlyph name="play" />
                  </span>
                </span>
                <strong>{view.name}</strong>
                {binding.viewId === view.id && (
                  <small>{playing ? "播放中" : "已选择"}</small>
                )}
              </button>
            ))}
            {!albums.length && (
              <p className="music-empty">
                {query ? "没有匹配的专辑。" : "这张表还没有视图。"}
              </p>
            )}
          </div>
        ) : listLoading ? (
          <p className="music-empty" role="status">
            正在加载歌曲…
          </p>
        ) : listError ? (
          <p className="reader-warning" role="alert">
            {listError}
          </p>
        ) : (
          <div className="music-track-list">
            {visible.slice(0, 500).map((track, index) => (
              <button
                key={key(track)}
                className={`music-track${current && key(current) === key(track) ? " is-playing" : ""}`}
                onClick={() =>
                  playFromScope({ tableId: binding.tableId }, track)
                }
              >
                <span className="music-track-index">
                  {current && key(current) === key(track) ? "♫" : index + 1}
                </span>
                <div>
                  <strong>{songTitle(track)}</strong>
                  <small>{songArtist(track)}</small>
                </div>
                <MusicGlyph name="play" />
              </button>
            ))}
            {!visible.length && (
              <p className="music-empty">
                {query ? "没有匹配的歌曲。" : "这张表里还没有音乐。"}
              </p>
            )}
          </div>
        )}
        {mode === "list" && visible.length > 500 && (
          <p className="data-hint">当前显示前 500 首，可搜索查找更多歌曲。</p>
        )}
      </section>
      {settings && (
        <Modal title="歌单来源" onClose={() => setSettings(false)}>
          <div className="music-library-controls">
            <label>
              数据表
              <select
                aria-label="音乐数据表"
                value={binding.tableId}
                onChange={(e) => setBinding({ tableId: e.target.value })}
              >
                <option value="">选择数据表</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              播放视图
              <select
                aria-label="音乐视图"
                disabled={!table}
                value={binding.viewId ?? ""}
                onChange={(e) =>
                  setBinding({
                    ...binding,
                    viewId: e.target.value || undefined,
                  })
                }
              >
                <option value="">整张表</option>
                {table?.views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="data-hint">
              {activeView?.name ?? table?.name ?? "选择歌曲所在的多维表"}
            </p>
            <div className="data-actions">
              <button
                className="data-button"
                disabled={loading || !binding.tableId}
                onClick={() => {
                  stop();
                  setRevision((r) => r + 1);
                  setLibraryRevision((r) => r + 1);
                }}
              >
                刷新歌单
              </button>
              <button
                className="data-button"
                onClick={() => {
                  setSettings(false);
                  onNavigate("data");
                }}
              >
                管理多维表
              </button>
              <button
                className="primary-button"
                onClick={() => setSettings(false)}
              >
                完成
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
