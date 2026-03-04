import { useEffect, useState } from "react";
import NavBar from "../common/Navbar";
import VoiceCard from "../feed/VoiceCard";
import { MOODS, getMoodByLabel } from "../../constants/moods";
import { fetchFeed } from "../../api/posts";
import { generateWave } from "../../utils/waveform";
import { timeAgo } from "../../utils/time";

const TIME_FILTERS = [
  { label: "Last hour", value: "last_hour" },
  { label: "Today", value: "today" },
];

/**
 * ExploreScreen
 * Discover live voice posts filtered by mood or time window.
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
 */
export default function ExploreScreen({
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
}) {
  const [moodFilter, setMoodFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("last_hour");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetchFeed(40, 0, {
      mood: moodFilter === "All" ? undefined : moodFilter,
      window: timeFilter,
    })
      .then(({ posts: apiPosts }) => {
        setPosts(
          apiPosts.map((p) => ({
            ...p,
            timeAgo: timeAgo(p.created_at),
            wave: generateWave(parseInt(p.id, 36) || Math.random()),
          }))
        );
      })
      .catch((err) => {
        setPosts([]);
        setError(err?.message || "Failed to load explore posts");
      })
      .finally(() => setLoading(false));
  }, [moodFilter, timeFilter]);

  const timeLabel = TIME_FILTERS.find((t) => t.value === timeFilter)?.label ?? "Last hour";

  return (
    <div className={`screen explore-screen ${visible ? "visible" : "hidden"}`}>
      <NavBar
        activeTab={activeTab}
        themeMode={themeMode}
        onThemeChange={onThemeChange}
        onTabChange={onTabChange}
        onRecord={onRecord}
        onProfile={onOpenOwnProfile}
      />

      <div className="explore-filters">
        {["All", ...MOODS.map((m) => m.label)].map((f) => {
          const mood = f !== "All" ? getMoodByLabel(f) : null;
          return (
            <button
              key={f}
              className={`filter-chip ${moodFilter === f ? "active" : ""}`}
              onClick={() => setMoodFilter(f)}
            >
              {mood ? `${mood.emoji} ` : ""}{f}
            </button>
          );
        })}
      </div>

      <div className="explore-filters" style={{ paddingTop: 4 }}>
        {TIME_FILTERS.map((t) => (
          <button
            key={t.value}
            className={`filter-chip ${timeFilter === t.value ? "active" : ""}`}
            onClick={() => setTimeFilter(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="section-label">
        {moodFilter === "All" ? "All moods" : moodFilter} · {timeLabel}
      </div>

      {loading && (
        <div className="feed-empty">
          <span>⏳</span>
          Loading voices...
        </div>
      )}

      {!loading && error && (
        <div className="feed-empty">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="feed-empty">
          <span>🌑</span>
          No voices match this filter yet.
        </div>
      )}

      {!loading && !error && posts.map((post, i) => (
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
  );
}
