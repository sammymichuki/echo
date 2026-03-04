const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch paginated feed.
 * GET /posts?limit=20&offset=0&mood=&window=
 */
export async function fetchFeed(limit = 20, offset = 0, filters = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (filters?.mood) params.set("mood", filters.mood);
  if (filters?.window) params.set("window", filters.window);

  const res = await fetch(`${BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch feed");
  return res.json(); // { posts: VoicePost[] }
}

/**
 * Fetch single post with its replies.
 * GET /posts/:id
 */
export async function fetchPost(id) {
  const res = await fetch(`${BASE}/posts/${id}`);
  if (!res.ok) throw new Error("Post not found");
  return res.json(); // VoicePost
}

/**
 * Upload a new voice post.
 * POST /posts   multipart/form-data { audio: File, mood: string, duration: number, anon_id: string }
 */
export async function createPost({ audioBlob, mood, duration, anonId }) {
  const form = new FormData();
  if (audioBlob) form.append("audio", audioBlob, "voice.webm");
  form.append("mood",     mood);
  form.append("duration", String(duration));
  form.append("anon_id",  anonId);

  const res = await fetch(`${BASE}/posts`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = "Failed to create post";
    try {
      const data = await res.json();
      if (data?.detail) {
        detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore JSON parse error and keep default detail
    }
    throw new Error(detail);
  }
  return res.json(); // created VoicePost
}

/**
 * Report a post.
 * POST /posts/:id/report
 */
export async function reportPost(id, reason) {
  const res = await fetch(`${BASE}/posts/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to report post");
  return res.json();
}
