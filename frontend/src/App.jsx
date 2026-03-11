import { useState, useEffect } from "react";
import "./styles/globals.css";

import OnboardScreen  from "./components/onboard/OnboardScreen";
import FeedScreen     from "./components/feed/FeedScreen";
import ExploreScreen  from "./components/explore/ExploreScreen";
import ThreadScreen   from "./components/thread/ThreadScreen";
import ProfileScreen  from "./components/profile/ProfileScreen";
import RecordScreen   from "./components/record/RecordScreen";
import TabBar         from "./components/common/TabBar";
import DesktopSidebar from "./components/common/DesktopSidebar";
import Toast          from "./components/common/Toast";
import { useToast }   from "./hooks/useToast";
import { useThemeMode } from "./hooks/useThemeMode";
import { recoverAnonymousAccount, registerAnonymousAccount, restoreSession } from "./api/auth";
import { fetchPost } from "./api/posts";
import { generateWave } from "./utils/waveform";
import { timeAgo } from "./utils/time";

const AUTH_TOKEN_KEY = "echo_auth_token";
const ANON_ID_KEY = "echo_anon_id";
const RECOVERY_CODE_KEY = "echo_recovery_code";

function persistAuth({ anonId, authToken, recoveryCode }) {
  if (anonId) localStorage.setItem(ANON_ID_KEY, anonId);
  if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  if (recoveryCode) localStorage.setItem(RECOVERY_CODE_KEY, recoveryCode);
}

function clearPersistedAuth() {
  localStorage.removeItem(ANON_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getStoredRecoveryCode() {
  return localStorage.getItem(RECOVERY_CODE_KEY) || "";
}

function normalizePath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function parseRoute(pathname) {
  if (pathname === "/" || pathname === "/onboard") {
    return { screen: "onboard" };
  }
  if (pathname === "/feed") {
    return { screen: "feed", tab: "feed" };
  }
  if (pathname === "/explore") {
    return { screen: "explore", tab: "explore" };
  }
  if (pathname === "/post") {
    return { screen: "feed", tab: "feed", openRecord: true };
  }

  const profileMatch = pathname.match(/^\/u\/([^/]+)$/);
  if (profileMatch) {
    try {
      return { screen: "profile", profileAnonId: decodeURIComponent(profileMatch[1]) };
    } catch {
      return { screen: "feed", tab: "feed", invalid: true };
    }
  }

  const threadMatch = pathname.match(/^\/post\/([^/]+)(?:\/replies)?$/);
  if (threadMatch) {
    try {
      return { screen: "thread", postId: decodeURIComponent(threadMatch[1]) };
    } catch {
      return { screen: "feed", tab: "feed", invalid: true };
    }
  }

  return { screen: "feed", tab: "feed", invalid: true };
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));
  const route = parseRoute(pathname);
  const [tab,         setTab]         = useState(route.tab ?? "feed"); // feed | explore
  const [openThread,  setOpenThread]  = useState(null);      // VoicePost | null
  const [threadFromProfile, setThreadFromProfile] = useState(null);
  const [showRecord,  setShowRecord]  = useState(false);
  const [newPost,     setNewPost]     = useState(null);      // triggers feed prepend
  const [authLoading, setAuthLoading] = useState(true);
  const [auth, setAuth] = useState({ anonId: "", authToken: "", recoveryCode: getStoredRecoveryCode() });
  const [recoveryReveal, setRecoveryReveal] = useState("");
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { message: toastMsg, show: showToast } = useToast();
  const anonId = auth.anonId;
  const authReady = Boolean(anonId);
  const screen = route.screen;

  function navigate(path, { replace = false } = {}) {
    const nextPath = normalizePath(path);
    if (nextPath === pathname) return;
    if (replace) window.history.replaceState({}, "", nextPath);
    else window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  }

  useEffect(() => {
    const onPopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    restoreSession(token)
      .then((session) => {
        const nextAuth = {
          anonId: session.anon_id,
          authToken: session.auth_token,
          recoveryCode: getStoredRecoveryCode(),
        };
        persistAuth(nextAuth);
        setAuth(nextAuth);
      })
      .catch(() => {
        clearPersistedAuth();
        setAuth({ anonId: "", authToken: "", recoveryCode: getStoredRecoveryCode() });
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (route.invalid) navigate("/feed", { replace: true });
  }, [route.invalid]);

  useEffect(() => {
    if (authLoading) return;
    if (!authReady && route.screen !== "onboard") {
      navigate("/onboard", { replace: true });
    }
  }, [authLoading, authReady, route.screen]);

  useEffect(() => {
    if (route.tab) setTab(route.tab);
  }, [route.tab]);

  useEffect(() => {
    if (!route.openRecord) return;
    setShowRecord(true);
  }, [route.openRecord]);

  useEffect(() => {
    if (route.screen !== "thread") setThreadFromProfile(null);
  }, [route.screen]);

  useEffect(() => {
    if (!authReady) return;
    if (route.screen !== "thread" || !route.postId) {
      if (route.screen !== "thread") setOpenThread(null);
      return;
    }
    if (openThread?.id === route.postId && openThread?.audio_url) return;

    fetchPost(route.postId, anonId)
      .then((post) => {
        setOpenThread({
          ...post,
          wave: generateWave(Math.random()),
          timeAgo: timeAgo(post.created_at) || "just now",
        });
      })
      .catch(() => {
        showToast("Post not found");
        navigate("/feed", { replace: true });
      });
  }, [authReady, route.screen, route.postId]);

  async function handleCreateAccount() {
    try {
      const session = await registerAnonymousAccount();
      const nextAuth = {
        anonId: session.anon_id,
        authToken: session.auth_token,
        recoveryCode: session.recovery_code || "",
      };
      persistAuth(nextAuth);
      setAuth(nextAuth);
      setRecoveryReveal(session.recovery_code || "");
      navigate("/onboard", { replace: true });
      showToast("Anonymous account created");
    } catch (err) {
      showToast(err?.message || "Failed to create account");
    }
  }

  async function handleRestoreAccount(recoveryCode) {
    try {
      const session = await recoverAnonymousAccount(recoveryCode);
      const nextAuth = {
        anonId: session.anon_id,
        authToken: session.auth_token,
        recoveryCode: session.recovery_code || recoveryCode.trim().toUpperCase(),
      };
      persistAuth(nextAuth);
      setAuth(nextAuth);
      setRecoveryReveal("");
      setTab("feed");
      navigate("/feed", { replace: true });
      showToast("Anonymous account restored");
    } catch (err) {
      showToast(err?.message || "Recovery failed");
    }
  }

  function handleContinueAfterRecovery() {
    setRecoveryReveal("");
    setTab("feed");
    navigate("/feed", { replace: true });
  }

  // When a new post is recorded, push it into the feed and navigate there
  function handleNewPost(post) {
    setNewPost(post);
    setShowRecord(false);
    setTab("feed");
    navigate("/feed");
    showToast("✓ Posted anonymously");
  }

  function handleTabChange(t) {
    setTab(t);
    navigate(t === "explore" ? "/explore" : "/feed");
  }

  function handleOpenThread(post, { fromProfileId = null } = {}) {
    setOpenThread(post);
    setThreadFromProfile(fromProfileId);
    navigate(`/post/${encodeURIComponent(post.id)}`);
  }

  function handleBack() {
    if (screen === "thread" && threadFromProfile) {
      navigate(`/u/${encodeURIComponent(threadFromProfile)}`);
      return;
    }
    navigate(tab === "explore" ? "/explore" : "/feed");
  }

  function handleOpenProfile(targetAnonId) {
    if (!targetAnonId) return;
    navigate(`/u/${encodeURIComponent(targetAnonId)}`);
  }

  function handleOpenOwnProfile() {
    handleOpenProfile(anonId);
  }

  function handleOpenCreatePost() {
    navigate("/post");
    setShowRecord(true);
  }

  function handleCloseRecord() {
    setShowRecord(false);
    if (pathname === "/post") {
      navigate(tab === "explore" ? "/explore" : "/feed", { replace: true });
    }
  }

  if (authLoading) {
    return <div id="echo-root" className="boot-splash">Loading account…</div>;
  }

  return (
    <div id="echo-root" className={screen !== "onboard" ? "with-sidebar" : ""}>
      {authReady && (
        <DesktopSidebar
          visible={screen !== "onboard"}
          screen={screen}
          activeTab={tab}
          anonId={anonId}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onGoFeed={() => handleTabChange("feed")}
          onGoExplore={() => handleTabChange("explore")}
          onOpenProfile={handleOpenOwnProfile}
          onRecord={handleOpenCreatePost}
        />
      )}

      <div className="app-main">
      {/* ── Onboarding ── */}
      <OnboardScreen
        visible={screen === "onboard" || !authReady}
        anonId={anonId}
        recoveryCode={recoveryReveal || auth.recoveryCode}
        revealRecovery={Boolean(recoveryReveal)}
        onCreateAccount={handleCreateAccount}
        onRestoreAccount={handleRestoreAccount}
        onContinue={handleContinueAfterRecovery}
      />

      {authReady && (
        <>
          {/* ── Feed ── */}
          <FeedScreen
            visible={screen === "feed"}
            anonId={anonId}
            activeTab={tab}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            onTabChange={handleTabChange}
            onRecord={handleOpenCreatePost}
            onOpenOwnProfile={handleOpenOwnProfile}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
            onToast={showToast}
            newPost={newPost}
          />

          {/* ── Explore ── */}
          <ExploreScreen
            visible={screen === "explore"}
            anonId={anonId}
            activeTab={tab}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            onTabChange={handleTabChange}
            onRecord={handleOpenCreatePost}
            onOpenOwnProfile={handleOpenOwnProfile}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
            onToast={showToast}
          />

          {/* ── Thread ── */}
          <ThreadScreen
            visible={screen === "thread"}
            post={openThread}
            anonId={anonId}
            onBack={handleBack}
            onOpenProfile={handleOpenProfile}
            onToast={showToast}
          />

          {/* ── Profile ── */}
          <ProfileScreen
            visible={screen === "profile"}
            anonId={anonId}
            profileAnonId={route.profileAnonId}
            onBack={handleBack}
            onOpenThread={handleOpenThread}
            onOpenProfile={handleOpenProfile}
            onToast={showToast}
          />

          {/* ── Record overlay ── */}
          {showRecord && (
            <RecordScreen
              anonId={anonId}
              onClose={handleCloseRecord}
              onPost={handleNewPost}
            />
          )}

          {/* ── Bottom tab bar (hidden on onboard) ── */}
          {screen !== "onboard" && (
            <TabBar
              activeTab={tab}
              onTabChange={handleTabChange}
              onRecord={handleOpenCreatePost}
            />
          )}
        </>
      )}

      {/* ── Toast notifications ── */}
      <Toast message={toastMsg} />
      </div>
    </div>
  );
}
