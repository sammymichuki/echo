/**
 * Waveform
 * Renders a row of animated bar-chart bars representing audio amplitude.
 *
 * Props:
 *   bars     – number[]  height values in [0,1]
 *   progress – number    playback progress in [0,1]
 *   playing  – boolean   whether audio is currently playing
 */
export default function Waveform({ bars = [], progress = 0, playing = false }) {
  return (
    <div className="waveform">
      {bars.map((h, i) => {
        const frac    = i / bars.length;
        const isPlayed = frac < progress;
        const isActive = playing && Math.abs(frac - progress) < 0.05;
        return (
          <div
            key={i}
            className={`wave-bar${isPlayed ? " played" : ""}${isActive ? " active" : ""}`}
            style={{ height: `${Math.max(14, h * 34)}px` }}
          />
        );
      })}
    </div>
  );
}