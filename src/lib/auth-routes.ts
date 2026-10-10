// Sign-in / sign-up screens. They are focused forms, so the shop's search row
// and bottom tab bar step aside there (the tab bar also used to cover the
// "Already have an account?" link). Single list so the header, bottom nav and
// app-shell check can't drift.
export const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-reset-otp',
  '/verify-email',
  '/resend-verification',
];

export function isAuthRoute(pathname: string | null): boolean {
  return !!pathname && AUTH_ROUTES.includes(pathname);
}
