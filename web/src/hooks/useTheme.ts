import { useSyncExternalStore } from "react";

const THEME_EVENT = "theme-changed";

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

/**
 * Tracks the current dark-mode state from the document class using an
 * external store subscription, so any component can render the correct icon.
 */
export function useTheme(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}

/** Applies the next theme and notifies the rest of the app. */
export function toggleTheme() {
  const currentlyDark = isDark();
  if (currentlyDark) {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
