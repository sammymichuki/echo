/**
 * DesktopSidebar
 * X-style left rail shown on larger screens.
 *
 * Props:
 *   visible        – boolean
 *   screen         – current route screen
 *   activeTab      – "feed" | "explore"
 *   anonId         – current anon user id
 *   themeMode      – "system" | "light" | "dark"
 *   onThemeChange  – (mode) => void
 *   onGoFeed       – () => void
 *   onGoExplore    – () => void
 *   onOpenProfile  – () => void
 *   onRecord       – () => void
 */
export default function DesktopSidebar({
  visible,
  screen,
  activeTab,
  anonId,
  themeMode,
  onThemeChange,
  onGoFeed,
  onGoExplore,
  onOpenProfile,
  onRecord,
}) {
  if (!visible) return null;
  const feedActive = screen === "feed" || (screen === "thread" && activeTab === "feed");
  const exploreActive = screen === "explore" || (screen === "thread" && activeTab === "explore");
  const profileActive = screen === "profile";

  return (
    <aside className="desktop-sidebar" aria-label="Desktop sidebar">
      <div className="desk-logo-wrap">
        <div className="desk-logo">echo</div>
        <div className="desk-subtitle">anonymous voices</div>
      </div>

      <nav className="desk-nav">
        <button
          className={`desk-nav-btn ${feedActive ? "active" : ""}`}
          onClick={onGoFeed}
        >
          ◎ Feed
        </button>
        <button
          className={`desk-nav-btn ${exploreActive ? "active" : ""}`}
          onClick={onGoExplore}
        >
          ◈ Explore
        </button>
        <button
          className={`desk-nav-btn ${profileActive ? "active" : ""}`}
          onClick={onOpenProfile}
        >
          👤 Profile
        </button>
      </nav>

      <button className="desk-record-btn" onClick={onRecord}>
        🎙 New voice
      </button>

      <div className="desk-footer">
        <label className="sr-only" htmlFor="desktop-theme-mode">Theme mode</label>
        <select
          id="desktop-theme-mode"
          className="theme-select desk-theme-select"
          value={themeMode}
          onChange={(e) => onThemeChange(e.target.value)}
          aria-label="Theme mode"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <div className="desk-user">@{anonId.slice(0, 12)}</div>
      </div>
    </aside>
  );
}
