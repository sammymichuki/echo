import { useEffect, useRef, useState } from "react";
import NavBar from "../common/Navbar";
import VoiceCard from "./VoiceCard";
import { fetchFeed } from "../../api/posts";
import { generateWave } from "../../utils/waveform";
import { timeAgo } from "../../utils/time";

const POLL_MS = 15000;
const SCROLL_DEEP_PX = 520;
const NEAR_END_PX = 220;

function enrichPost(p) {
  return {
    ...p,
    timeAgo: timeAgo(p.created_at),
    wave: generateWave(parseInt(p.id, 36) || Math.random()),
  };
}

function mergeUnique(newer, older) {
  const seen = new Set();
  const merged = [];
  for (const post of [...newer, ...older]) {
    if (!post?.id || seen.has(post.id)) continue;
    seen.add(post.id);
    merged.push(post);
  }
  return merged;
}

/**
 * FeedScreen
 * Scrollable chronological feed of voice posts.
 *
 * Props:
 *   visible      – boolean
 *   anonId       – string
 *   activeTab    – "feed" | "explore"
 *   themeMode    – "system" | "light" | "dark"
 *   onThemeChange – (mode) => void
 *   onTabChange  – (tab) => void
 *   onRecord     – () => void
 *   onOpenOwnProfile – () => void
 *   onOpenThread – (post) => void
 *   onOpenProfile – (anonId) => void
 *   onToast      – (msg) => void
 *   newPost      – VoicePost | null  – optimistically prepended after recording
 */
export default function FeedScreen({
  visible,
  anonId,
  activeTab,
  themeMode,
  onThemeChange,
  onTabChange,
  onRecord,
  onOpenOwnProfile,
  onOpenThread,
  onOpenProfile,
  onToast,
  newPost,
}) {
  const [posts, setPosts] = useState([]);
  const [pendingNewPosts, setPendingNewPosts] = useState([]);
  const screenRef = useRef(null);
  const postsRef = useRef([]);
  const nearEndRef = useRef(false);
  const hasScrolledFarRef = useRef(false);

  // Load real posts from API
  useEffect(() => {
    fetchFeed(30, 0, {}, anonId)
      .then(({ posts: apiPosts }) => {
        setPosts(apiPosts.map(enrichPost));
      })
      .catch(() => setPosts([]));
  }, [anonId]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  function applyNewerPosts(newerPosts) {
    if (!newerPosts.length) return;
    setPosts((prev) => mergeUnique(newerPosts, prev));
    onToast?.(`✨ ${newerPosts.length} newer ${newerPosts.length === 1 ? "post" : "posts"} loaded`);
  }

  function maybeApplyPending() {
    if (!pendingNewPosts.length) return;
    if (!(nearEndRef.current && hasScrolledFarRef.current)) return;
    const toApply = pendingNewPosts;
    setPendingNewPosts([]);
    applyNewerPosts(toApply);
  }

  function handleFeedScroll(e) {
    const el = e.currentTarget;
    const nearEnd = el.scrollHeight - (el.scrollTop + el.clientHeight) <= NEAR_END_PX;
    const scrolledFar = el.scrollTop >= SCROLL_DEEP_PX;
    nearEndRef.current = nearEnd;
    hasScrolledFarRef.current = scrolledFar;
    maybeApplyPending();
  }

  useEffect(() => {
    if (!visible) return undefined;

    const id = setInterval(async () => {
      try {
        const { posts: latestPosts } = await fetchFeed(12, 0, {}, anonId);
        const latest = latestPosts.map(enrichPost);
        const existingIds = new Set(postsRef.current.map((p) => p.id));
        const fresh = latest.filter((p) => !existingIds.has(p.id));
        if (!fresh.length) return;

        if (nearEndRef.current && hasScrolledFarRef.current) {
          applyNewerPosts(fresh);
        } else {
          setPendingNewPosts((prev) => mergeUnique(fresh, prev));
        }
      } catch {
        // keep silent; feed polling is best-effort
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [anonId, visible, onToast]);

  // Prepend new post optimistically
  useEffect(() => {
    if (!newPost) return;
    setPosts((prev) => mergeUnique([newPost], prev));
    setPendingNewPosts((prev) => prev.filter((p) => p.id !== newPost.id));
  }, [newPost]);

  return (
    <div
      ref={screenRef}
      className={`screen feed-screen ${visible ? "visible" : "hidden"}`}
      onScroll={handleFeedScroll}
    >
      <NavBar
        activeTab={activeTab}
        themeMode={themeMode}
        onThemeChange={onThemeChange}
        onTabChange={onTabChange}
        onRecord={onRecord}
        onProfile={onOpenOwnProfile}
      />

      <div className="feed-scroll">
        {pendingNewPosts.length > 0 && (
          <div className="feed-newer-hint">
            {pendingNewPosts.length} newer {pendingNewPosts.length === 1 ? "post" : "posts"} waiting
          </div>
        )}

        {posts.length === 0 && (
          <div className="feed-empty">
            <span>🌑</span>
            No voices yet. Be the first to speak.
          </div>
        )}

        {posts.map((post, i) => (
          <div key={post.id} style={{ animationDelay: `${i * 0.04}s` }}>
            <VoiceCard
              post={post}
              anonId={anonId}
              onClick={() => onOpenThread(post)}
              onReply={() => onOpenThread(post)}
              onOpenProfile={onOpenProfile}
              onToast={onToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
