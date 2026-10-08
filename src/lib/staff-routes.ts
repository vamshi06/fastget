// The staff screens (admin panel + agent panel) have their own chrome
// (BackOfficeShell), so store-only UI - header, footer, bottom nav, promo bar,
// location picker - must stay out of them. Single list so they can't drift.
const STAFF_ROUTE_PREFIXES = ['/admin', '/agent-dashboard', '/agent/'];

export function isStaffRoute(pathname: string | null): boolean {
  return !!pathname && STAFF_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
