// Which native chrome a site route gets. MUST stay in sync with the site's
// src/lib/shell-routes.ts - the site hides its own header/bottom nav to match.
//
//   tab   - top-level destinations: native bottom tab bar
//   sub   - everything else: native top bar (back + title)
//   staff - admin / agent panels: no native chrome (they have their own)

export type RouteKind = 'tab' | 'sub' | 'staff';

export type TabKey = 'home' | 'categories' | 'orders' | 'account';

// No Cart tab: the cart is the floating pill (CartPill), as in Blinkit/Zepto.
export const TABS: { key: TabKey; path: string; icon: string; activeIcon: string; fallbackLabel: string }[] = [
  { key: 'home',       path: '/',           icon: 'home-outline',           activeIcon: 'home',           fallbackLabel: 'Home' },
  { key: 'categories', path: '/categories', icon: 'view-grid-outline',      activeIcon: 'view-grid',      fallbackLabel: 'Categories' },
  { key: 'orders',     path: '/my-orders',  icon: 'clipboard-list-outline', activeIcon: 'clipboard-list', fallbackLabel: 'Orders' },
  { key: 'account',    path: '/account',    icon: 'account-outline',        activeIcon: 'account',        fallbackLabel: 'Account' },
];

const TAB_ROOTS = TABS.map((t) => t.path);
const STAFF_PREFIXES = ['/admin', '/agent-dashboard', '/agent/'];

export function getRouteKind(path: string): RouteKind {
  if (STAFF_PREFIXES.some((p) => path.startsWith(p))) return 'staff';
  return TAB_ROOTS.includes(path) ? 'tab' : 'sub';
}

export function getActiveTab(path: string): TabKey | null {
  return TABS.find((t) => t.path === path)?.key ?? null;
}

// Cart / checkout have their own pinned bar for the cart, so the top bar's
// cart shortcut would be redundant there.
export function showsCartShortcut(path: string): boolean {
  return !path.startsWith('/cart') && !path.startsWith('/checkout');
}

// Browsing screens get the floating cart pill. Not product pages (they have
// their own Add to cart bar), cart/checkout, or forms.
export function showsCartPill(path: string): boolean {
  return getRouteKind(path) === 'tab' || path === '/catalog' || path === '/wishlist';
}

/** Pathname of a URL on our origin, or null for anything else. */
export function pathOf(url: string, origin: string): string | null {
  if (!url.startsWith(origin)) return null;
  const rest = url.slice(origin.length);
  if (rest !== '' && !rest.startsWith('/') && !rest.startsWith('?') && !rest.startsWith('#')) return null;
  const path = rest.split(/[?#]/)[0];
  return path === '' ? '/' : path;
}
