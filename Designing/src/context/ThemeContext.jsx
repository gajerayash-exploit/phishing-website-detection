import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ============================================
   Theme
   ============================================

   Previously the theme lived in two places: App.jsx held a `theme` state and
   Settings.jsx held its own `settings.theme`, each writing `data-theme` and
   localStorage directly. Two consequences:

   1. Changing the theme in Settings left App's state stale, so the next click
      of the Navbar toggle reverted the user's choice.
   2. Choosing "System" persisted the literal string 'system' as `data-theme`.
      Nothing in index.css matches `[data-theme='system']` — only `:root` and
      `[data-theme='dark']` — so the app silently fell back to light and
      ignored the OS preference entirely, defeating the option's whole purpose.

   The fix separates the two ideas that were conflated:
   - `preference` is what the user picked: 'light' | 'dark' | 'system'.
   - `theme` is what actually gets painted: 'light' | 'dark'.

   Only `theme` is ever written to the DOM, so `data-theme` is always a value
   the stylesheet understands. */

const STORAGE_KEY = 'theme';
const ThemeContext = createContext(null);

const isPreference = (value) => value === 'light' || value === 'dark' || value === 'system';

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const readStoredPreference = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Anything unrecognised (including values written by the old buggy code)
    // falls back to following the OS rather than guessing wrong.
    return isPreference(stored) ? stored : 'system';
  } catch {
    // localStorage throws in private-mode Safari and sandboxed iframes.
    return 'system';
  }
};

export const ThemeProvider = ({ children }) => {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState(() => (prefersDark() ? 'dark' : 'light'));

  // Track the OS setting so 'system' stays live instead of being sampled once
  // at startup. The old code never subscribed to this at all.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    // Only ever 'light' or 'dark' reaches the DOM.
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Persistence is a nicety; a failure here must not break the UI.
    }
  }, [preference]);

  const setPreference = useCallback((next) => {
    if (isPreference(next)) setPreferenceState(next);
  }, []);

  // Toggling acts on what the user currently *sees*. If they're on 'system'
  // and it resolves dark, the toggle should produce light — not jump to dark
  // again, which is what the old `prev === 'dark' ? 'light' : 'dark'` did.
  const toggleTheme = useCallback(() => {
    setPreferenceState(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  // Memoised so consumers don't re-render on every provider render.
  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
