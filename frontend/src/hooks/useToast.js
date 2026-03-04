import { useState, useCallback } from "react";

/**
 * Lightweight toast notification hook.
 * Returns { message, show } – pass `message` to <Toast /> and call `show("…")`.
 */
export function useToast(duration = 2800) {
  const [message, setMessage] = useState(null);

  const show = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, [duration]);

  return { message, show };
}