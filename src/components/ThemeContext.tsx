'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { applyTheme, isThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

interface ThemeContextType {
  /** What the user picked ('system' = follow the device). */
  preference: ThemePreference;
  /** What is actually showing. */
  resolvedTheme: 'light' | 'dark';
  /** False until the saved preference has been read; resolvedTheme is a guess before that. */
  isLoaded: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemDark, setSystemDark] = useState(false);
  // THEME_SCRIPT already applied the right class before paint; don't touch
  // html.dark until the saved preference is read, or it would flash light.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setPreferenceState(readPreference());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    setIsLoaded(true);

    const onSystemChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    // Keep other open tabs in step.
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setPreferenceState(readPreference());
    };
    mq.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      mq.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const resolvedTheme = preference === 'dark' || (preference === 'system' && systemDark) ? 'dark' : 'light';

  useEffect(() => {
    if (isLoaded) applyTheme(resolvedTheme === 'dark');
  }, [isLoaded, resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage unavailable - the choice still applies for this visit
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, isLoaded, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
