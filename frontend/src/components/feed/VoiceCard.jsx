import { useEffect, useRef, useState } from "react";
import Waveform from "../common/Waveform";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { addReaction } from "../../api/reactions";
import { recordShare, recordView, reportPost, toggleRepost, toggleSave } from "../../api/posts";
import { getMoodByLabel } from "../../constants/moods";
import { REACTIONS } from "../../constants/reactions";
import { timeUntil } from "../../utils/time";
import { generateWave, loadWaveFromUrl } from "../../utils/waveform";

function normalizeReactionCounts(counts = {}) {
  return REACTIONS.reduce((acc, reaction) => {
    acc[reaction.emoji] = counts?.[reaction.emoji] ?? 0;
    return acc;
  }, {});
}

function formatCount(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count ?? 0);
}

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
  const { playing, progress, toggle, seek } = useAudioPlayer(post.audio_url, post.duration);
  const isReply = Boolean(post.post_id);
  const [bars, setBars] = useState(post.wave ?? generateWave());
  const [userReaction, setUserReaction] = useState(post.viewer_reaction ?? null);
  const [reactionCounts, setReactionCounts] = useState(() => normalizeReactionCounts(post.reaction_counts));
  const [replyCount, setReplyCount] = useState(post.reply_count ?? post.replies?.length ?? post.replies ?? 0);
  const [repostCount, setRepostCount] = useState(post.repost_count ?? 0);
  const [reposted, setReposted] = useState(Boolean(post.viewer_reposted));
  const [viewCount, setViewCount] = useState(post.view_count ?? 0);
  const [shareCount, setShareCount] = useState(post.share_count ?? 0);
  const [saveCount, setSaveCount] = useState(post.save_count ?? 0);
  const [saved, setSaved] = useState(Boolean(post.viewer_saved));
  const [reported, setReported] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const viewTrackedRef = useRef(false);
  const previewReplies = post.reply_preview?.length
    ? post.reply_preview
    : [...(post.replies || [])].slice(-2).reverse();
  const expiryLabel = post.expires_at ? timeUntil(post.expires_at, nowTick) : null;

  useEffect(() => {
    setBars(post.wave ?? generateWave());
    setUserReaction(post.viewer_reaction ?? null);
    setReactionCounts(normalizeReactionCounts(post.reaction_counts));
    setReplyCount(post.reply_count ?? post.replies?.length ?? post.replies ?? 0);
    setRepostCount(post.repost_count ?? 0);
    setReposted(Boolean(post.viewer_reposted));
    setViewCount(post.view_count ?? 0);
    setShareCount(post.share_count ?? 0);
    setSaveCount(post.save_count ?? 0);
    setSaved(Boolean(post.viewer_saved));
    setReported(false);
    viewTrackedRef.current = false;
  }, [
    post.id,
    post.wave,
    post.viewer_reaction,
    post.reaction_counts,
    post.reply_count,
    post.replies,
    post.repost_count,
    post.viewer_reposted,
    post.view_count,
    post.share_count,
    post.save_count,
    post.viewer_saved,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!post.audio_url) return undefined;

    loadWaveFromUrl(post.audio_url)
      .then((nextBars) => {
        if (!cancelled && nextBars?.length) setBars(nextBars);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [post.audio_url]);

  useEffect(() => {
    if (!post.expires_at) return undefined;
    const id = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [post.expires_at]);

  useEffect(() => {
    if (!playing || isReply) return;
    trackView();
  }, [playing, isReply]);

  async function trackView() {
    if (!anonId || isReply || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    try {
      const data = await recordView(post.id, anonId);
      setViewCount(data.view_count ?? 0);
    } catch {
      viewTrackedRef.current = false;
    }
  }

  async function handleReaction(emoji) {
    try {
      const data = await addReaction({ postId: post.id, emoji, anonId });
      setUserReaction(data.viewer_reaction ?? null);
      setReactionCounts(normalizeReactionCounts(data.reaction_counts));
      onToast?.(data.reacted ? "Reaction updated" : "Reaction removed");
    } catch {
      onToast?.("Reaction failed");
    }
  }

  async function handleRepost(e) {
    e.stopPropagation();
    try {
      const data = await toggleRepost(post.id, anonId);
      setReposted(Boolean(data.viewer_reposted));
      setRepostCount(data.repost_count ?? 0);
      onToast?.(data.reposted ? "Reposted" : "Repost removed");
    } catch {
      onToast?.("Repost failed");
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

  async function handleShare(e) {
    e.stopPropagation();
    if (sharePending || isReply) return;

    const url = `${window.location.origin}/post/${encodeURIComponent(post.id)}`;
    const payload = {
      title: `${post.mood} voice on Echo`,
      text: "Listen to this voice on Echo",
      url,
    };

    setSharePending(true);
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("share-unavailable");
      }
      const data = await recordShare(post.id, anonId);
      setShareCount(data.share_count ?? 0);
      onToast?.("Link shared");
    } catch (err) {
      if (err?.name !== "AbortError") onToast?.("Share failed");
    } finally {
      setSharePending(false);
    }
  }

  async function handleSave(e) {
    e.stopPropagation();
    if (isReply) return;
    try {
      const data = await toggleSave(post.id, anonId);
      setSaved(Boolean(data.viewer_saved));
      setSaveCount(data.save_count ?? 0);
      onToast?.(data.saved ? "Saved" : "Removed from saved");
    } catch {
      onToast?.("Save failed");
    }
  }

  async function handleReport(e) {
    e.stopPropagation();
    if (isReply || reported) return;
    try {
      await reportPost(post.id, "other", anonId);
      setReported(true);
      onToast?.("Post reported");
    } catch {
      onToast?.("Report failed");
    }
  }

  function handleCardClick() {
    if (!isReply) trackView();
    onClick?.();
  }

  return (
    <div className={`voice-card${compact ? " compact" : ""}`} onClick={handleCardClick}>
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
          {!isReply && (
            <button
              className={`report-flag${reported ? " active" : ""}`}
              onClick={handleReport}
              aria-label="Report post"
              title={reported ? "Reported" : "Report post"}
            >
              ⚑
            </button>
          )}
          {expiryLabel && <span className="expires-chip">{expiryLabel}</span>}
          <span className="card-meta">{post.time_ago ?? post.timeAgo}</span>
        </div>
      </div>

      {/* Waveform player row */}
      <div className="waveform-row">
        <button
          className={`play-btn${playing ? " playing" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isReply) trackView();
            toggle();
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <Waveform
          bars={bars}
          progress={progress}
          playing={playing}
          onSeek={(nextProgress) => {
            if (!isReply) trackView();
            seek(nextProgress);
          }}
        />
        <span className="duration">{post.duration}s</span>
      </div>

      {!compact && !isReply && previewReplies.length > 0 && (
        <div className="reply-preview-strip">
          {previewReplies.map((reply) => (
            <span key={reply.id} className="reply-preview-chip">
              <span>{getMoodByLabel(reply.mood)?.emoji ?? "🎙"}</span>
              <span>{reply.user_id === anonId ? "you" : `@${reply.user_id.slice(0, 6)}`}</span>
            </span>
          ))}
        </div>
      )}

      {/* Reactions + reply count */}
      {!compact && !isReply && (
        <div className="card-actions">
          {REACTIONS.map((r) => (
            <button
              key={r.emoji}
              className={`reaction-btn${userReaction === r.emoji ? " reacted" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleReaction(r.emoji); }}
              title={r.label}
            >
              <span>{r.emoji}</span>
              <span>{formatCount(reactionCounts[r.emoji])}</span>
            </button>
          ))}

          <button
            className={`action-btn${reposted ? " active" : ""}`}
            onClick={handleRepost}
            aria-label="Repost"
            title="Repost"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Right arrow (top) */}
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              {/* Left arrow (bottom) */}
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>{formatCount(repostCount)}</span>
          </button>

          <button
            className="action-btn"
            onClick={handleReplyButtonClick}
            aria-label="Open replies"
            title="Reply"
          >
            🎙 <span>{formatCount(replyCount)}</span>
          </button>

          <span className="meta-chip" title="Views">
            👁 <span>{formatCount(viewCount)}</span>
          </span>

          <button
            className="action-btn"
            onClick={handleSave}
            aria-label="Save"
            title="Save"
          >
            {saved ? "🔖" : "📑"} <span>{formatCount(saveCount)}</span>
          </button>

          <button
            className="action-btn share-btn"
            onClick={handleShare}
            aria-label="Share"
            title="Share"
          >
            ↗ <span>{formatCount(shareCount)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
