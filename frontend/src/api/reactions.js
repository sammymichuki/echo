const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Add or toggle a reaction on a post.
 * POST /posts/:postId/reactions
 */
export async function addReaction({ postId, emoji, anonId }) {
  const res = await fetch(`${BASE}/posts/${postId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji, anon_id: anonId }),
  });
  if (!res.ok) throw new Error("Failed to add reaction");
  return res.json();
}
