const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch one anonymous account with all their posts and replies to those posts.
 * GET /users/:anonId/posts
 */
export async function fetchUserPosts(anonId, viewerId = null) {
  const params = new URLSearchParams();
  if (viewerId) params.set("viewer_id", viewerId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/users/${encodeURIComponent(anonId)}/posts${suffix}`);
  if (!res.ok) {
    let detail = "Failed to fetch user posts";
    try {
      const data = await res.json();
      if (data?.detail) {
        detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // keep default error
    }
    throw new Error(detail);
  }
  return res.json();
}
