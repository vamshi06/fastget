/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * We use it to validate required environment variables at boot so a
 * misconfigured deploy is obvious in the logs rather than a per-request 500.
 */
export async function register() {
  // Only the Node.js server runtime has the full env + reads process.env the
  // way our libs expect; skip the Edge runtime pass.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { validateRuntimeConfig } = await import('@/lib/config-check');
  validateRuntimeConfig();
}
