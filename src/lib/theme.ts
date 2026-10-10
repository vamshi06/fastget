// Light / dark theme. Kept out of ThemeContext.tsx ('use client') so the
// root layout (a server component) can inline THEME_SCRIPT.

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system'];

export const THEME_STORAGE_KEY = 'fg-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Toggles html.dark - the palette in tailwind.config.ts keys off it. */
export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

// Runs before first paint so a dark-theme user never sees a white flash.
// No saved preference = follow the device.
export const THEME_SCRIPT = `(function () {
  try {
    var p = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = p === 'dark' || (p !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();`;
