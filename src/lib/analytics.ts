import posthog from 'posthog-js';
import type { CaptureResult } from 'posthog-js';
import { isStaffRoute } from '@/lib/staff-routes';

// Product analytics (PostHog): funnels, retention and session replay, so we
// can see where customers drop off. OFF unless NEXT_PUBLIC_POSTHOG_KEY is set
// (inlined at build time - changing it needs a redeploy). Every call here is
// a no-op while it's off, so callers never need to check.
//
// Events go to /ingest on our own domain, which next.config.mjs rewrites to
// PostHog - ad blockers don't drop them and the CSP needs no new hosts.
//
// Event names are the contract with the funnels built in the PostHog
// dashboard - renaming one silently breaks its funnel.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const UI_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_REGION === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com';

export type AnalyticsEvent =
  | 'product_viewed'
  | 'added_to_cart'
  | 'removed_from_cart'
  | 'cart_viewed'
  | 'reordered'
  | 'whatsapp_chat_opened'
  | 'checkout_login_required'
  | 'checkout_started'
  | 'checkout_error'
  | 'payment_opened'
  | 'payment_dismissed'
  | 'payment_failed'
  | 'order_placed'
  | 'searched'
  | 'signed_up'
  | 'signup_error'
  | 'logged_in'
  | 'login_error'
  | 'logged_out'
  | 'wishlist_added';

let started = false;
let replayPaused = false;

// Pages whose URL carries a secret (order status token, reset/verify links)
// or an email address. Never recorded on replay; their URLs are scrubbed below.
const SENSITIVE_PREFIXES = ['/order/', '/reset-password', '/verify-email', '/verify-reset-otp'];

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some((p) => pathname.startsWith(p));
}

// Strips secrets/PII out of a URL-ish string: the /order/<statusToken> path
// segment and token/email/otp query params.
function scrubUrl(value: string): string {
  return value
    .replace(/\/order\/[^/?#\s]+/g, '/order/:token')
    .replace(/([?&](?:token|email|otp|code)=)[^&#\s]*/gi, '$1redacted');
}

function scrubProps(props: Record<string, unknown> | undefined) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string') props[k] = scrubUrl(v);
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  // Staff using the admin/agent panels aren't customers - keep them out.
  if (typeof window !== 'undefined' && isStaffRoute(window.location.pathname)) return null;
  if (event.event === '$snapshot') return event;
  scrubProps(event.properties);
  scrubProps(event.$set);
  scrubProps(event.$set_once);
  return event;
}

export function initAnalytics() {
  if (started || !KEY || typeof window === 'undefined') return;
  started = true;

  const inApp = Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
  const path = window.location.pathname;
  replayPaused = isSensitiveRoute(path) || isStaffRoute(path);

  posthog.init(KEY, {
    api_host: '/ingest',
    ui_host: UI_HOST,
    defaults: '2025-05-24', // pageviews on client-side navigation + pageleave
    person_profiles: 'identified_only',
    disable_session_recording: replayPaused,
    // Inputs are masked in replays. Names/addresses/phones shown as plain text
    // carry the `ph-no-capture` class: replays show a blank box there, and
    // autocapture never sends the text of a tap on them.
    session_recording: { maskAllInputs: true },
    before_send: beforeSend,
  });

  // Attached to every event - lets each funnel be split by app vs browser.
  posthog.register({
    platform: inApp ? 'android_app' : 'web',
    native_shell: document.documentElement.classList.contains('native-shell'),
  });
}

/** Called on every route change - pauses replay on pages with secrets in the URL. */
export function onRouteChange(pathname: string) {
  if (!started) return;
  const sensitive = isSensitiveRoute(pathname) || isStaffRoute(pathname);
  if (sensitive && !replayPaused) {
    replayPaused = true;
    posthog.stopSessionRecording();
  } else if (!sensitive && replayPaused) {
    // Only resume what we paused - replay switched off in the dashboard stays off.
    replayPaused = false;
    posthog.startSessionRecording();
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.capture(event, props);
}

/** Ties this device's events to the signed-in account. No name/email/phone is sent. */
export function identifyUser(userId: string, role?: string) {
  if (!started) return;
  posthog.identify(userId, { role: role || 'customer' });
}

/** On logout: start a fresh anonymous visitor so the next person isn't merged in. */
export function resetUser() {
  if (!started) return;
  posthog.reset();
}
