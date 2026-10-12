import { useMusic } from "./runtime";
import { MusicGlyph, musicTime, songTitle, songArtist } from "./MusicVisuals";
import "./compact-card.css";
export default function CompactMusicCard({
  onOpen,
  onRemove,
}: {
  onOpen: () => void;
  onRemove: () => void;
}) {
  const {
    current,
    tracks,
    opening,
    playing,
    elapsed,
    duration,
    toggle,
    seek,
    advance,
    error,
    repeat,
    setRepeat,
  } = useMusic();
  return (
    <article
      className="home-music-card compact-music-card"
      aria-label="音乐控制卡片"
    >
      <button
        className={`home-music-disc${playing ? " is-playing" : ""}`}
        aria-label="打开音乐播放器"
        onClick={onOpen}
      >
        <span>
          <i />
        </span>
      </button>
      <div className="compact-music-body">
        <div className="compact-music-title">
          <div>
            <strong>{songTitle(current ?? tracks[0])}</strong>
            <small>
              {opening
                ? "正在加载…"
                : songArtist(current ?? tracks[0]) || "本地音乐"}
            </small>
          </div>
          <button
            className="home-music-remove"
            aria-label="移除音乐模块"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
        <div className="compact-music-progress">
          <input
            className="home-music-progress"
            type="range"
            aria-label="音乐卡片播放进度"
            min={0}
            max={duration || 0}
            value={Math.min(elapsed, duration)}
            disabled={!duration}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <span>{musicTime(elapsed)}</span>
        </div>
        <div className="home-music-bottom">
          <div className="home-music-transport">
            <button
              aria-label={
                repeat === "off"
                  ? "开启音乐循环"
                  : repeat === "all"
                    ? "单曲循环"
                    : "关闭音乐循环"
              }
              title="循环"
              aria-pressed={repeat !== "off"}
              onClick={() =>
                setRepeat(
                  repeat === "off" ? "all" : repeat === "all" ? "one" : "off",
                )
              }
            >
              <MusicGlyph name="repeat" />
            </button>
            <button
              aria-label="上一首"
              disabled={!tracks.length || opening}
              onClick={() => advance(-1)}
            >
              <MusicGlyph name="previous" />
            </button>
            <button
              className="home-music-play"
              aria-label={playing ? "暂停音乐" : "播放音乐"}
              disabled={!tracks.length || opening}
              onClick={toggle}
            >
              <MusicGlyph name={playing ? "pause" : "play"} />
            </button>
            <button
              aria-label="下一首"
              disabled={!tracks.length || opening}
              onClick={() => advance(1)}
            >
              <MusicGlyph name="next" />
            </button>
          </div>
          <button
            className="home-music-open"
            aria-label="展开播放器"
            title="展开播放器"
            onClick={onOpen}
          >
            ↗
          </button>
        </div>
      </div>
      {error && (
        <p className="home-music-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
