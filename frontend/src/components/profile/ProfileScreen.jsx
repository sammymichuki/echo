import { useEffect, useMemo, useState } from "react";
import VoiceCard from "../feed/VoiceCard";
import { fetchUserPosts } from "../../api/users";
import { generateWave } from "../../utils/waveform";
import { timeAgo } from "../../utils/time";

function decorateReply(reply) {
  return {
    ...reply,
    wave: generateWave(parseInt(reply.id, 36) || Math.random()),
    timeAgo: timeAgo(reply.created_at) || "just now",
  };
}

function decorateWrittenReply(reply) {
  return {
    ...decorateReply(reply),
    parentPost: reply.parent_post,
    parentTimeAgo: timeAgo(reply.parent_post?.created_at) || "just now",
  };
}

function decoratePost(post) {
  return {
    ...post,
    wave: generateWave(parseInt(post.id, 36) || Math.random()),
    timeAgo: timeAgo(post.created_at) || "just now",
    replies: (post.replies || []).map(decorateReply),
  };
}

export default function ProfileScreen({
  visible,
  anonId,
  profileAnonId,
  onBack,
  onOpenThread,
  onOpenProfile,
  onToast,
}) {
  const [posts, setPosts] = useState([]);
  const [wroteReplies, setWroteReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible || !profileAnonId) return;

    setLoading(true);
    setError("");
    fetchUserPosts(profileAnonId, anonId)
      .then(({ posts: apiPosts, wrote_replies: apiWroteReplies }) => {
        setPosts(apiPosts.map(decoratePost));
        setWroteReplies((apiWroteReplies || []).map(decorateWrittenReply));
      })
      .catch((err) => {
        setPosts([]);
        setWroteReplies([]);
        setError(err?.message || "Failed to load account");
      })
      .finally(() => setLoading(false));
  }, [anonId, visible, profileAnonId]);

  const totalReplies = useMemo(
    () => posts.reduce((sum, post) => sum + (post.replies?.length ?? post.reply_count ?? 0), 0),
    [posts]
  );
  const isSelf = profileAnonId === anonId;

  return (
    <div className={`screen profile-screen ${visible ? "visible" : "hidden"}`}>
      <div className="thread-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">←</button>
        <div className="thread-title">{isSelf ? "Your account" : "Anonymous account"}</div>
      </div>

      <div className="profile-summary">
        <div className="profile-handle">@{profileAnonId?.slice(0, 14)}</div>
        <div className="profile-stats">
          <span>{posts.length} posts</span>
          <span>·</span>
          <span>{totalReplies} replies received</span>
          <span>·</span>
          <span>{wroteReplies.length} replies written</span>
        </div>
      </div>

      {loading && (
        <div className="feed-empty">
          <span>⏳</span>
          Loading account...
        </div>
      )}

      {!loading && error && (
        <div className="feed-empty">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && wroteReplies.length === 0 && (
        <div className="feed-empty">
          <span>🎙</span>
          No posts from this account yet.
        </div>
      )}

      {!loading && !error && posts.map((post, i) => (
        <div key={post.id} className="profile-post-wrap" style={{ animationDelay: `${i * 0.04}s` }}>
          <VoiceCard
            post={post}
            anonId={anonId}
            onClick={() => onOpenThread(post, { fromProfileId: profileAnonId })}
            onReply={() => onOpenThread(post, { fromProfileId: profileAnonId })}
            onOpenProfile={onOpenProfile}
            onToast={onToast}
          />

          <div className="profile-replies-label">
            Replies · {post.replies?.length ?? 0}
          </div>

          {(post.replies || []).map((reply) => (
            <div key={reply.id} className="reply-card profile-reply-card">
              <VoiceCard
                post={reply}
                anonId={anonId}
                compact
                onClick={() => onOpenThread(post, { fromProfileId: profileAnonId })}
                onReply={() => onOpenThread(post, { fromProfileId: profileAnonId })}
                onOpenProfile={onOpenProfile}
                onToast={onToast}
              />
            </div>
          ))}
        </div>
      ))}

      {!loading && !error && wroteReplies.length > 0 && (
        <div className="profile-extra-section">
          <div className="profile-replies-label">
            Replies this account wrote · {wroteReplies.length}
          </div>

          {wroteReplies.map((reply) => (
            <div key={reply.id} className="reply-card profile-reply-card">
              <div className="profile-written-head">
                <span>on {reply.parentPost?.mood || "post"} · {reply.parentTimeAgo}</span>
                <button
                  className="profile-parent-link"
                  onClick={() => onOpenThread({ id: reply.post_id }, { fromProfileId: profileAnonId })}
                >
                  Open thread
                </button>
              </div>
              <VoiceCard
                post={reply}
                anonId={anonId}
                compact
                onClick={() => onOpenThread({ id: reply.post_id }, { fromProfileId: profileAnonId })}
                onReply={() => onOpenThread({ id: reply.post_id }, { fromProfileId: profileAnonId })}
                onOpenProfile={onOpenProfile}
                onToast={onToast}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
