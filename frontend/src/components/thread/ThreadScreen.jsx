import { useState, useEffect } from "react";
import VoiceCard from "../feed/VoiceCard";
import RecordScreen from "../record/RecordScreen";
import { fetchReplies } from "../../api/replies";
import { generateWave } from "../../utils/waveform";
import { timeAgo } from "../../utils/time";

/**
 * ThreadScreen
 * Shows a parent voice post and its threaded voice replies.
 *
 * Props:
 *   post    – VoicePost (the parent)
 *   anonId  – string
 *   onBack  – () => void
 *   onOpenProfile – (anonId) => void
 *   onToast – (msg) => void
 *   visible – boolean
 */
export default function ThreadScreen({ post, anonId, onBack, onOpenProfile, onToast, visible }) {
  const [replies,     setReplies]     = useState([]);
  const [showRecord,  setShowRecord]  = useState(false);

  function mapReply(rep) {
    return {
      ...rep,
      wave: generateWave(),
      timeAgo: rep.timeAgo ?? (timeAgo(rep.created_at) || "just now"),
    };
  }

  useEffect(() => {
    if (!post) return;
    fetchReplies(post.id, anonId)
      .then(({ replies: r }) =>
        setReplies(r.map(mapReply).reverse())
      )
      .catch(() => setReplies([]));
  }, [anonId, post?.id]);

  function handleNewReply(data) {
    setReplies((prev) => [
      mapReply({ ...data, created_at: data.created_at ?? new Date().toISOString() }),
      ...prev,
    ]);
    setShowRecord(false);
    onToast?.("Reply posted 🎙");
  }

  if (!post) return null;

  return (
    <>
      <div className={`screen thread-screen ${visible ? "visible" : "hidden"}`}>
        {/* Sticky thread header */}
        <div className="thread-header">
          <button className="back-btn" onClick={onBack} aria-label="Back">←</button>
          <div className="thread-title">Voice thread</div>
        </div>

        {/* Parent post */}
        <div className="thread-parent">
          <VoiceCard post={post} anonId={anonId} onOpenProfile={onOpenProfile} onToast={onToast} />
        </div>

        {/* Replies */}
        <div className="replies-head">
          <div className="replies-label">
            Replies · {replies.length}
          </div>
          <button className="thread-reply-btn" onClick={() => setShowRecord(true)}>
            🎙 Add reply
          </button>
        </div>

        {replies.length === 0 && (
          <div className="feed-empty">
            <span>🎙</span>
            No replies yet. Be the first voice.
          </div>
        )}

        {replies.map((r, i) => (
          <div key={r.id} className="reply-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <VoiceCard post={r} anonId={anonId} compact onOpenProfile={onOpenProfile} onToast={onToast} />
          </div>
        ))}
      </div>

      {/* Reply record sheet */}
      {showRecord && (
        <RecordScreen
          isReply
          anonId={anonId}
          parentPostId={post.id}
          onClose={() => setShowRecord(false)}
          onPost={handleNewReply}
        />
      )}
    </>
  );
}
