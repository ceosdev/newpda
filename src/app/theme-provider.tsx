import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useCurrentProfile } from '@/features/auth/api/use-current-profile';
import { useUpdateThemePreference } from '@/features/auth/api/use-update-theme-preference';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = 'pelada-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(resolved: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const { data: profile } = useCurrentProfile();
  const updateThemePreference = useUpdateThemePreference();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Once the server-side preference loads, adopt it locally if it differs.
  // The localStorage fallback handles the boot flash and the logged-out path.
  useEffect(() => {
    const remote = profile?.theme_preference;
    if (!remote) return;
    if (remote !== theme) {
      window.localStorage.setItem(STORAGE_KEY, remote);
      setThemeState(remote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.theme_preference]);

  const setTheme = useCallback(
    (next: Theme) => {
      window.localStorage.setItem(STORAGE_KEY, next);
      setThemeState(next);
      // Only persist when there's a profile to attach the preference to;
      // logged-out visitors fall back to localStorage only.
      if (profile?.id) {
        updateThemePreference.mutate({ value: next });
      }
    },
    [profile?.id, updateThemePreference],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider />');
  return ctx;
}
