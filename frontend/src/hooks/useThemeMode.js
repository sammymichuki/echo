import { useEffect, useState } from "react";

const THEME_KEY = "echo_theme_mode";
const VALID_MODES = new Set(["system", "light", "dark"]);

function readStoredMode() {
  const stored = localStorage.getItem(THEME_KEY);
  return VALID_MODES.has(stored) ? stored : "system";
}

function resolveTheme(mode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function useThemeMode() {
  const [mode, setMode] = useState(readStoredMode);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);

    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = resolveTheme(mode);
    };

    apply();

    if (mode !== "system") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();

    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [mode]);

  return { mode, setMode };
}
