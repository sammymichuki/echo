/**
 * TabBar
 * Fixed bottom navigation with Feed, Record (center), and Explore tabs.
 *
 * Props:
 *   activeTab   – "feed" | "explore"
 *   onTabChange – (tab: string) => void
 *   onRecord    – () => void
 */
export default function TabBar({ activeTab, onTabChange, onRecord }) {
    return (
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => onTabChange("feed")}
        >
          <span className="icon">◎</span>
          Feed
        </button>
  
        <button
          className="tab-item tab-center"
          onClick={onRecord}
          aria-label="Record new voice"
        >
          <span className="icon">🎙</span>
        </button>
  
        <button
          className={`tab-item ${activeTab === "explore" ? "active" : ""}`}
          onClick={() => onTabChange("explore")}
        >
          <span className="icon">◈</span>
          Explore
        </button>
      </div>
    );
  }