const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function registerAnonymousAccount() {
  const res = await fetch(`${BASE}/auth/register`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create anonymous account");
  return res.json();
}

export async function restoreSession(token) {
  const res = await fetch(`${BASE}/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
}

export async function recoverAnonymousAccount(recoveryCode) {
  const res = await fetch(`${BASE}/auth/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recovery_code: recoveryCode }),
  });
  if (!res.ok) throw new Error("Recovery code not found");
  return res.json();
}
