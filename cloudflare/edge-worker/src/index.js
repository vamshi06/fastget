/**
 * FastGet edge fallback - Cloudflare Worker in front of fastget.in.
 *
 * Every request is passed straight through to the origin (Vercel today,
 * Railway before/after). Only when the HOSTING PLATFORM fails - not our app -
 * do we swap the response for a branded "back shortly" page, so customers
 * never see "The train has not arrived at the station" or a Vercel error.
 *
 * What counts as a platform failure (see platformError):
 *   - Vercel platform errors (x-vercel-error header: DEPLOYMENT_NOT_FOUND,
 *     DEPLOYMENT_DISABLED, FUNCTION_INVOCATION_FAILED, ...)
 *   - Railway's edge fallback (x-railway-fallback header)
 *   - Cloudflare origin errors 520-530 (origin down / unreachable / timeout)
 *   - Non-JSON 502/503/504. Our own API returns 502/503 *with JSON* bodies
 *     (e.g. "Could not verify payment status with Razorpay.") and those must
 *     reach the app untouched.
 *   - The origin fetch throwing (DNS failure, connection refused, ...)
 *
 * For developers: the fallback response carries `x-fastget-edge-error` with
 * the real reason, every fallback is logged (Workers Logs, searchable by the
 * reference shown on the page = Cloudflare Ray ID), and if Telegram is
 * configured an alert is sent at most once per 10 minutes per reason.
 */

const ALERT_COOLDOWN_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    // If this Worker itself throws, fall through to the origin as if it
    // didn't exist - the fallback must never be the thing that breaks the site.
    ctx.passThroughOnException();

    const ref = request.headers.get('cf-ray') || crypto.randomUUID();

    let response;
    let reason;
    try {
      response = await fetch(request);
      reason = platformError(response);
    } catch (err) {
      reason = `fetch_failed:${err && err.message ? err.message : 'unknown'}`;
    }

    if (!reason) return response;

    const url = new URL(request.url);
    const detail = {
      ref,
      reason,
      status: response ? response.status : null,
      method: request.method,
      path: url.pathname,
      host: url.host,
      server: response ? response.headers.get('server') : null,
      colo: request.cf && request.cf.colo,
    };
    console.error(JSON.stringify({ msg: 'origin platform error - serving fallback', ...detail }));
    ctx.waitUntil(sendAlert(env, detail));

    return fallbackResponse(request, ref, reason);
  },
};

/** Returns a short reason string if `res` is a hosting-platform failure, else null. */
export function platformError(res) {
  const vercelError = res.headers.get('x-vercel-error');
  if (vercelError) return `vercel:${vercelError}`;

  if (res.headers.get('x-railway-fallback')) return `railway:${res.status}`;

  if (res.status >= 520 && res.status <= 530) return `cloudflare:${res.status}`;

  if ([502, 503, 504].includes(res.status)) {
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) return `gateway:${res.status}`;
  }
  return null;
}

function wantsHtml(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/api/')) return false;
  return (request.headers.get('accept') || '').includes('text/html');
}

function fallbackResponse(request, ref, reason) {
  const headers = {
    'cache-control': 'no-store',
    'retry-after': '60',
    'x-fastget-edge-error': reason,
    'x-fastget-ref': ref,
  };

  // API callers (website JS, mobile app, Razorpay webhook) get the same
  // { success, error } shape our routes use; a 503 also makes Razorpay retry.
  if (!wantsHtml(request)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'FastGet is temporarily unavailable. Please try again in a few minutes.',
        ref,
      }),
      { status: 503, headers: { ...headers, 'content-type': 'application/json' } },
    );
  }

  return new Response(renderPage(ref), {
    status: 503,
    headers: { ...headers, 'content-type': 'text/html; charset=utf-8' },
  });
}

async function sendAlert(env, detail) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ALERT_CHAT_ID) return;

  // Throttle per reason via the colo-local cache - an outage hits every
  // request, and one alert per 10 minutes is plenty.
  const cache = caches.default;
  const key = new Request(`https://edge-alerts.fastget.in/${encodeURIComponent(detail.reason)}`);
  if (await cache.match(key)) return;
  await cache.put(
    key,
    new Response('sent', { headers: { 'cache-control': `max-age=${ALERT_COOLDOWN_SECONDS}` } }),
  );

  const text = [
    '🚨 fastget.in origin error - customers are seeing the fallback page',
    `Reason: ${detail.reason}`,
    `Status: ${detail.status ?? 'no response'}`,
    `Request: ${detail.method} ${detail.host}${detail.path}`,
    `Ref (Ray ID): ${detail.ref}`,
    'Look up the ref in Cloudflare → Workers & Pages → fastget-edge → Logs.',
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_ALERT_CHAT_ID, text }),
    });
  } catch (err) {
    console.error(JSON.stringify({ msg: 'telegram alert failed', error: String(err) }));
  }
}

function renderPage(ref) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>FastGet - Back shortly</title>
<style>
  :root { --brand: #F5A623; --ink: #1f2937; --muted: #6b7280; --bg: #fffaf2; --card: #ffffff; }
  @media (prefers-color-scheme: dark) {
    :root { --ink: #f3f4f6; --muted: #9ca3af; --bg: #111827; --card: #1f2937; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         padding: 16px; background: var(--bg); color: var(--ink);
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .card { max-width: 420px; width: 100%; background: var(--card); border-radius: 16px; padding: 32px 24px;
          text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
  .logo { font-size: 28px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 20px; }
  .logo span { color: var(--brand); }
  .icon { width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: var(--brand);
          display: flex; align-items: center; justify-content: center; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { margin: 0 0 6px; color: var(--muted); line-height: 1.5; font-size: 15px; }
  button { margin-top: 20px; background: var(--brand); color: #1f2937; border: 0; border-radius: 10px;
           padding: 12px 28px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
  .ref { margin-top: 20px; font-size: 11px; color: var(--muted); word-break: break-all; }
</style>
</head>
<body>
<main class="card">
  <div class="logo">Fast<span>Get</span></div>
  <div class="icon" aria-hidden="true">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>
  </div>
  <h1>We'll be back shortly</h1>
  <p>FastGet is undergoing a quick maintenance. Your orders and account are safe.</p>
  <p>हम जल्द ही वापस आएंगे। कृपया कुछ मिनट बाद पुनः प्रयास करें।</p>
  <button type="button" onclick="location.reload()">Try again</button>
  <div class="ref">Ref: ${escapeHtml(ref)}</div>
</main>
<script>setTimeout(function () { location.reload(); }, 60000);</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
