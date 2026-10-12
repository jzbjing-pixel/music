import type { DataRecord } from "../../src/data/model";
export const musicTime = (value: number) =>
  `${Math.floor(Math.max(0, value) / 60)}:${String(Math.floor(Math.max(0, value) % 60)).padStart(2, "0")}`;
export const songTitle = (track?: DataRecord) =>
  track?.name.replace(/\.(?:mp3|wav|flac|m4a|aac|ogg|opus|wma)$/i, "") ??
  "未选择歌曲";
export function songArtist(track?: DataRecord) {
  const value = track?.properties.artist ?? track?.properties["歌手"];
  return typeof value === "string" ? value : (track?.sourceName ?? "");
}
export function MusicGlyph({
  name,
}: {
  name:
    | "play"
    | "pause"
    | "previous"
    | "next"
    | "shuffle"
    | "repeat"
    | "grid"
    | "list";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "play" ? (
        <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />
      ) : name === "pause" ? (
        <>
          <path d="M8 5v14M16 5v14" strokeWidth="4" />
        </>
      ) : name === "previous" ? (
        <>
          <path d="M5 5v14" />
          <path d="m19 5-11 7 11 7Z" fill="currentColor" stroke="none" />
        </>
      ) : name === "next" ? (
        <>
          <path d="M19 5v14" />
          <path d="m5 5 11 7-11 7Z" fill="currentColor" stroke="none" />
        </>
      ) : name === "shuffle" ? (
        <>
          <path d="M3 5h3c5 0 7 14 12 14h3M3 19h3c2 0 4-3 5-6M14 8c1-2 2-3 4-3h3m-3-3 3 3-3 3m0 8 3 3-3 3" />
        </>
      ) : name === "repeat" ? (
        <>
          <path d="M4 9a5 5 0 0 1 5-5h11m-3-3 3 3-3 3M20 15a5 5 0 0 1-5 5H4m3-3-3 3 3 3" />
        </>
      ) : name === "grid" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      ) : (
        <>
          <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" />
        </>
      )}
    </svg>
  );
}
