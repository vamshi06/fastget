// Which native chrome the Android app's shell (mobile/) shows for a route.
// MUST stay in sync with mobile/src/shell/routes.ts - the app decides what
// to draw from the same rules, and the site hides its own chrome to match.
//
//   tab   - top-level destinations: native bottom tab bar; the site keeps its
//           own header (location, search) since it's part of the content.
//   sub   - everything else: native top bar (back + title); the site hides
//           its header.
//   staff - admin / agent panels: no native chrome; they have their own.
import { isStaffRoute } from './staff-routes';

export const TAB_ROOTS = ['/', '/categories', '/my-orders', '/account'] as const;

export type RouteKind = 'tab' | 'sub' | 'staff';

export function getRouteKind(pathname: string): RouteKind {
  if (isStaffRoute(pathname)) return 'staff';
  return (TAB_ROOTS as readonly string[]).includes(pathname) ? 'tab' : 'sub';
}

// Set by the app at page start (injectedJavaScriptBeforeContentLoaded). The
// cookie is what the head script reads on later loads, since the injected
// script isn't guaranteed to run before it on Android.
export const SHELL_COOKIE = 'fg_shell';
export const SHELL_VERSION = '2';
