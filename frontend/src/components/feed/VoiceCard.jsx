import { useEffect, useState } from "react";
import Waveform from "../common/Waveform";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { addReaction } from "../../api/reactions";
import { getMoodByLabel } from "../../constants/moods";
import { REACTIONS } from "../../constants/reactions";

/**
 * VoiceCard
 * Renders a single voice post with playback, reactions, and reply count.
 *
 * Props:
 *   post    – VoicePost object
 *   anonId  – current user's anonymous ID
 *   onClick – () => void   – opens the thread view
 *   onReply – () => void   – opens thread/reply flow
 *   onOpenProfile – (anonId) => void
 *   onToast – (msg) => void
 *   compact – boolean      – hides reactions row (used inside threads)
 */
export default function VoiceCard({
  post,
  anonId,
  onClick,
  onReply,
  onOpenProfile,
  onToast,
  compact = false,
}) {
  const mood = getMoodByLabel(post.mood);
  const { playing, progress, toggle } = useAudioPlayer(post.audio_url, post.duration);
  const [userReaction, setUserReaction] = useState(null);
  const [replyCount, setReplyCount] = useState(post.reply_count ?? post.replies ?? 0);

  useEffect(() => {
    setReplyCount(post.reply_count ?? post.replies ?? 0);
  }, [post.id, post.reply_count, post.replies]);

  async function handleReaction(emoji) {
    if (userReaction) return; // one reaction per post
    setUserReaction(emoji);
    try {
      await addReaction({ postId: post.id, emoji, anonId });
      onToast?.("Reaction sent 🤍");
    } catch {
      setUserReaction(null); // rollback on error
    }
  }

  function handleReplyButtonClick(e) {
    e.stopPropagation();
    onReply?.();
  }

  function handleProfileClick(e) {
    e.stopPropagation();
    if (!post.user_id) return;
    onOpenProfile?.(post.user_id);
  }

  return (
    <div className="voice-card" onClick={onClick}>
      {/* Header: mood tag + timestamp */}
      <div className="card-header">
        <span
          className="mood-tag"
          style={{
            color: mood.color,
            borderColor: mood.color + "44",
            background: mood.bg,
          }}
        >
          {mood.emoji} {post.mood}
        </span>
        <div className="card-meta-wrap">
          {post.user_id && (
            <button className="author-btn" onClick={handleProfileClick}>
              {post.user_id === anonId ? "you" : `@${post.user_id.slice(0, 8)}`}
            </button>
          )}
          <span className="card-meta">{post.time_ago ?? post.timeAgo}</span>
        </div>
      </div>

      {/* Waveform player row */}
      <div className="waveform-row">
        <button
          className={`play-btn${playing ? " playing" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <Waveform bars={post.wave} progress={progress} playing={playing} />
        <span className="duration">{post.duration}s</span>
      </div>

      {/* Reactions + reply count */}
      {!compact && (
        <div className="card-actions">
          {REACTIONS.map((r) => (
            <button
              key={r.emoji}
              className={`reaction-btn${userReaction === r.emoji ? " reacted" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleReaction(r.emoji); }}
              title={r.label}
              disabled={!!userReaction}
            >
              {r.emoji} {r.label}
            </button>
          ))}

          <button
            className="reply-btn"
            onClick={handleReplyButtonClick}
            aria-label="Open replies"
            title="reply"
          >
            🎙 <span className="reply-count">{replyCount}</span>
          </button>
        </div>
      )}
    </div>
  );
}
