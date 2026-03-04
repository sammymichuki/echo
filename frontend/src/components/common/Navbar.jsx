/**
 * NavBar
 * Sticky top bar with logo, Feed/Explore tab switcher, and quick record button.
 *
 * Props:
 *   activeTab    – "feed" | "explore"
 *   themeMode    – "system" | "light" | "dark"
 *   onThemeChange – (mode: string) => void
 *   onTabChange  – (tab: string) => void
 *   onRecord     – () => void
 *   onProfile    – () => void
 */
export default function NavBar({ activeTab, themeMode, onThemeChange, onTabChange, onRecord, onProfile }) {
    return (
      <div className="navbar">
        <div className="nav-logo">echo</div>
  
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "feed" ? "active" : ""}`}
            onClick={() => onTabChange("feed")}
          >
            Feed
          </button>
          <button
            className={`nav-tab ${activeTab === "explore" ? "active" : ""}`}
            onClick={() => onTabChange("explore")}
          >
            Explore
          </button>
        </div>
  
        <div className="nav-actions">
          <label className="sr-only" htmlFor="theme-mode">Theme mode</label>
          <select
            id="theme-mode"
            className="theme-select"
            value={themeMode}
            onChange={(e) => onThemeChange(e.target.value)}
            aria-label="Theme mode"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <button className="nav-record-btn" onClick={onRecord} aria-label="Record voice">
            🎙
          </button>

          <button className="nav-profile-btn" onClick={onProfile} aria-label="Open your profile">
            👤
          </button>
        </div>
      </div>
    );
  }
