import { useState } from "react";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { createPost } from "../../api/posts";
import { createReply } from "../../api/replies";
import { MOODS } from "../../constants/moods";
import { fmtSeconds } from "../../utils/time";
import { generateWave, loadWaveFromBlob } from "../../utils/waveform";
import { claimAudioSession, releaseAudioSession } from "../../utils/audioSession";

/**
 * RecordScreen
 * Full-screen overlay for recording and posting a voice note or reply.
 *
 * Props:
 *   isReply      – boolean      – true when replying to a parent post
 *   parentPostId – string|null  – required when isReply=true
 *   anonId       – string       – current user's anonymous ID
 *   onClose      – () => void
 *   onPost       – (newPost) => void  – called with the created post object
 */
export default function RecordScreen({
  isReply = false,
  parentPostId = null,
  anonId,
  onClose,
  onPost,
}) {
  const MAX = isReply ? 45 : 60;

  // FIX: destructure reset so we can re-record
  const { recording, recorded, elapsed, blob, error, start, stop, reset } =
    useAudioRecorder(MAX);

  const [selectedMood, setSelectedMood] = useState(null);
  const [posting, setPosting]           = useState(false);
  const [apiError, setApiError]         = useState("");

  const pct = (elapsed / MAX) * 100;

  // FIX: play back recorded audio instead of re-calling start()
  function handlePreview() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const sessionId = `preview_${Date.now()}`;
    claimAudioSession(sessionId, () => {
      audio.pause();
      audio.currentTime = 0;
      URL.revokeObjectURL(url);
      releaseAudioSession(sessionId);
    });
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(url);
      releaseAudioSession(sessionId);
    }, { once: true });
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      releaseAudioSession(sessionId);
    });
  }

  async function handlePost() {
    if (posting) return;
    setApiError("");

    if (!recorded || !blob) {
      setApiError("No audio captured. Hold to record and allow microphone access.");
      return;
    }

    setPosting(true);
    const mood = selectedMood || "Lonely";
    try {
      let created;
      let wave = generateWave();
      try {
        wave = await loadWaveFromBlob(blob);
      } catch {
        wave = generateWave();
      }
      const safeDuration = Math.max(elapsed, 1);
      if (isReply) {
        created = await createReply({
          postId: parentPostId,
          audioBlob: blob,
          mood,
          duration: safeDuration,
          anonId,
        });
      } else {
        created = await createPost({
          audioBlob: blob,
          mood,
          duration: safeDuration,
          anonId,
        });
      }
      onPost({ ...created, wave, timeAgo: "just now" });
    } catch (err) {
      setApiError(err?.message || "Failed to post voice.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="screen record-screen visible"
      style={{
        zIndex: 400,
        position: "fixed",
        top: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "430px", maxWidth: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="record-header">
        <button className="record-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="record-header-title">
          {isReply ? "Add your voice" : "New voice"}
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div className="record-step">
        {/* Elapsed timer */}
        <div className={`record-time${recording ? " recording" : ""}`}>
          {fmtSeconds(elapsed)}
        </div>

        {/* Status hint */}
        <div className="record-hint">
          {!recording && !recorded && (isReply ? "Hold to record your reply" : "Hold to record")}
          {recording && `Recording… ${MAX - elapsed}s remaining`}
          {recorded && !recording && "Tap ▶ to preview · Choose a mood and post"}
        </div>

        {/* Circular progress + mic button */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <svg width="120" height="120" style={{ position: "absolute", top: -16, left: -16 }}>
            <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(232,168,124,0.1)" strokeWidth="2" />
            <circle
              cx="60" cy="60" r="55"
              fill="none"
              stroke={recording ? "#e87c8a" : "#e8a87c"}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 55}`}
              strokeDashoffset={`${2 * Math.PI * 55 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "60px 60px",
                transition: "stroke-dashoffset 1s linear",
              }}
            />
          </svg>

          <div className="mic-ring-wrap">
            {recording && (
              <><div className="mic-ripple" /><div className="mic-ripple" /><div className="mic-ripple" /></>
            )}
            <button
              className={`mic-btn${recording ? " recording" : ""}`}
              // FIX: preventDefault on mouseDown stops the browser from also firing
              // a synthetic mousedown after a touchstart, preventing double-start
              onMouseDown={(e) => { e.preventDefault(); if (!recorded) start(); }}
              onMouseUp={stop}
              onMouseLeave={stop}
              onTouchStart={(e) => { e.preventDefault(); if (!recorded) start(); }}
              onTouchEnd={stop}
              // FIX: if pointer leaves while held (e.g. scroll), stop recording
              onPointerCancel={stop}
              // FIX: prevent long-press context menu on mobile
              onContextMenu={(e) => e.preventDefault()}
              // FIX: ▶ plays back audio; during/before recording this is a no-op
              // (start/stop are handled by pointer events above)
              onClick={recorded && !recording ? handlePreview : undefined}
              aria-label={recording ? "Stop recording" : recorded ? "Preview recording" : "Start recording"}
            >
              {recorded && !recording ? "▶" : "🎙"}
            </button>
          </div>
        </div>

        {!recorded && <div className="record-cta">⬆ hold to record</div>}

        {!recorded && (
          <button
            type="button"
            className="record-fallback-btn"
            onClick={() => (recording ? stop() : start())}
            style={{ marginBottom: 14 }}
          >
            {recording ? "Stop recording" : "Tap to record"}
          </button>
        )}

        {/* FIX: re-record button so the user isn't stuck after a bad take */}
        {recorded && !recording && (
          <button
            onClick={() => { reset(); setApiError(""); }}
            className="rerecord-btn"
            style={{ fontSize: 13, marginBottom: 8, background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
          >
            ↩ Re-record
          </button>
        )}

        {error    && <div style={{ color: "var(--coral)", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {apiError && <div style={{ color: "var(--coral)", fontSize: 12, marginBottom: 12 }}>{apiError}</div>}

        {/* Mood picker */}
        <div className="mood-section">
          <div className="mood-label">Choose a mood</div>
          <div className="mood-chips">
            {MOODS.map((m) => (
              <button
                key={m.label}
                className={`mood-chip${selectedMood === m.label ? " selected" : ""}`}
                style={{ color: m.color }}
                onClick={() => setSelectedMood(m.label)}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Post CTA */}
        <button
          className="post-btn"
          disabled={!recorded || !blob || posting}
          onClick={handlePost}
        >
          {posting ? "Posting…" : "🎙 Post Anonymously"}
        </button>
      </div>
    </div>
  );
}
