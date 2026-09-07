import { useSyncExternalStore } from "react";
import { storage } from "../utils/storage";

type Theme = "light" | "dark";

const STORAGE_KEY = "peopleos-theme";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

function readStoredTheme(): Theme | null {
  const stored = storage.get<Theme | null>(STORAGE_KEY, null);
  return stored === "light" || stored === "dark" ? stored : null;
}

/** Stored choice wins; otherwise follow the OS on first visit. */
function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? (systemPrefersDark() ? "dark" : "light");
}

let currentTheme: Theme = resolveInitialTheme();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  // Keeps native form controls / scrollbars in step with the app theme.
  document.documentElement.style.colorScheme = theme;
}

function setTheme(theme: Theme) {
  currentTheme = theme;
  storage.set(STORAGE_KEY, theme);
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

/** Applied once at module load so there's no flash before React mounts. */
applyTheme(currentTheme);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Shared theme state — every caller reads the same value and re-renders
 * together, so toggling in the navbar updates any other consumer.
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => currentTheme,
  );

  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(currentTheme === "light" ? "dark" : "light"),
  };
}
