/**
 * Returns a human-readable "time ago" string from an ISO timestamp.
 * Falls back gracefully for invalid inputs.
 */
export function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    if (isNaN(diff)) return "";
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
  
  /** Formats seconds as MM:SS */
export function fmtSeconds(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

export function timeUntil(isoString) {
  const diff = new Date(isoString).getTime() - Date.now();
  if (isNaN(diff) || diff <= 0) return "expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}
