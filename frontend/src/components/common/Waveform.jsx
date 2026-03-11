/**
 * Waveform
 * Renders a row of animated bar-chart bars representing audio amplitude.
 *
 * Props:
 *   bars     – number[]  height values in [0,1]
 *   progress – number    playback progress in [0,1]
 *   playing  – boolean   whether audio is currently playing
 */
export default function Waveform({ bars = [], progress = 0, playing = false, onSeek = null }) {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  const activeIndex = bars.length ? Math.min(Math.floor(safeProgress * bars.length), bars.length - 1) : -1;

  function handlePointerSeek(e) {
    if (!onSeek || !bars.length) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const nextProgress = (e.clientX - rect.left) / rect.width;
    onSeek(nextProgress);
  }

  return (
    <div
      className={`waveform${onSeek ? " seekable" : ""}`}
      onClick={(e) => onSeek && e.stopPropagation()}
      onPointerDown={handlePointerSeek}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        handlePointerSeek(e);
      }}
      role={onSeek ? "slider" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(safeProgress * 100) : undefined}
      aria-label={onSeek ? "Seek playback position" : undefined}
    >
      {bars.map((h, i) => {
        const frac = (i + 1) / bars.length;
        const isPlayed = frac <= safeProgress;
        const isActive = playing && i === activeIndex;
        return (
          <div
            key={i}
            className={`wave-bar${isPlayed ? " played" : ""}${isActive ? " active" : ""}`}
            style={{ height: `${Math.max(14, h * 34)}px` }}
          />
        );
      })}
      <div className="wave-progress-line" style={{ width: `${safeProgress * 100}%` }} />
    </div>
  );
}
