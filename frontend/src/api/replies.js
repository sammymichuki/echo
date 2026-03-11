const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch all replies for a post.
 * GET /posts/:postId/replies
 */
export async function fetchReplies(postId, anonId = null) {
  const params = new URLSearchParams();
  if (anonId) params.set("viewer_id", anonId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/posts/${postId}/replies${suffix}`);
  if (!res.ok) throw new Error("Failed to fetch replies");
  return res.json(); // { replies: VoiceReply[] }
}

/**
 * Post a voice reply.
 * POST /posts/:postId/replies   multipart/form-data
 */
export async function createReply({ postId, audioBlob, mood, duration, anonId }) {
  const form = new FormData();
  if (audioBlob) form.append("audio", audioBlob, "reply.webm");
  form.append("mood",     mood);
  form.append("duration", String(duration));
  form.append("anon_id",  anonId);

  const res = await fetch(`${BASE}/posts/${postId}/replies`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = "Failed to post reply";
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
  return res.json();
}
