import { getPosthog } from './posthog';

export type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props?: AnalyticsEventProps) {
  const ph = getPosthog();
  if (!ph) return;
  ph.capture(event, props || {});
}

export function identify(distinctId: string, props?: AnalyticsEventProps) {
  const ph = getPosthog();
  if (!ph) return;
  ph.identify(distinctId, props || {});
}

