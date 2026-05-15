import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function initPosthog() {
  // Prevent double init
  if (typeof window === 'undefined') return;
  if (!KEY) return;
  if ((posthog as any).__loaded) return;

  posthog.init(KEY, {
    api_host: HOST || 'https://app.posthog.com',
    capture_pageview: true,
    autocapture: false,
    debug: true,
  });
}


export function getPosthog() {
  if (typeof window === 'undefined') return null;
  return posthog;
}

