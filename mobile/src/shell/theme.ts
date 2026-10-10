import { createContext, useContext } from 'react';

// Mirrors the site's brand tokens (tailwind.config.ts) so native chrome and
// web content read as one app. The dark set matches the site's dark palette.
export const lightColors = {
  primary: '#F5A623',
  // Top of the site's mobile header gradient (Header.tsx) - the status bar
  // strip above it must match exactly. Orange in both themes.
  headerTop: '#F5A623',
  primaryTint: '#FEF3DC', // active tab indicator
  charcoal: '#1C1C1E',
  slate: '#6B6B6E',
  steel: '#9A9A9A',
  border: '#ECECEC',
  surface: '#FFFFFF',
  // Page background, shown by the WebView between page loads.
  page: '#F5F5F5',
  badge: '#EF4444',
  // Floating cart pill - dark in both themes, with white text.
  pill: '#1C1C1E',
  // Text on brand-orange buttons.
  onPrimary: '#1C1C1E',
  ripple: 'rgba(0,0,0,0.12)',
};

export type ShellColors = typeof lightColors;

export const darkColors: ShellColors = {
  ...lightColors,
  primaryTint: '#3A2C14',
  charcoal: '#F2F2F3',
  slate: '#A6A6AC',
  steel: '#808087',
  border: '#2C2C31',
  surface: '#1B1B1F',
  page: '#0F0F11',
  pill: '#2C2C31',
  ripple: 'rgba(255,255,255,0.12)',
};

/** Provided by WebViewScreen: follows the site's THEME message, else the phone. */
export const ShellColorsContext = createContext<ShellColors>(lightColors);

export function useShellColors() {
  return useContext(ShellColorsContext);
}
