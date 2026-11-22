import { useEffect, useSyncExternalStore } from 'react';

/**
 * Light / dark theme. The choice is 'system' (follow the device), 'light' or 'dark',
 * remembered in this browser. index.html applies it before the page draws, so it never
 * flashes the wrong colours; this file keeps it up to date afterwards.
 */
const KEY = 'qx-theme';
const CHOICES = ['system', 'light', 'dark'];
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
const listeners = new Set();

function read() {
  try {
    const v = window.localStorage.getItem(KEY);
    return CHOICES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

let choice = typeof window !== 'undefined' ? read() : 'system';

export function resolvedTheme(c = choice) {
  if (c === 'light' || c === 'dark') return c;
  return media?.matches ? 'light' : 'dark';
}

function apply() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f7fb' : '#05080f');
  listeners.forEach((fn) => fn());
}

export function setThemeChoice(next) {
  choice = CHOICES.includes(next) ? next : 'system';
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
  apply();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** { choice, theme, setChoice } and re-renders when either changes. */
export function useTheme() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${choice}:${resolvedTheme()}`,
    () => 'system:dark'
  );
  const [c, theme] = snapshot.split(':');
  return { choice: c, theme, setChoice: setThemeChoice };
}

/** Mount once: follows the device setting while the choice is 'system'. */
export function useThemeSync() {
  useEffect(() => {
    apply();
    if (!media) return undefined;
    const onChange = () => {
      if (choice === 'system') apply();
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
}
