import { logger } from '@/lib/logger';

/**
 * Startup validation for required environment variables.
 *
 * Runs once at server boot (via src/instrumentation.ts) so a misconfigured
 * deploy fails LOUDLY in the logs instead of silently surfacing a generic
 * "Internal server error" 500 on every login. The classic failure this guards
 * against: ADMIN_SESSION_SECRET unset in the hosting env (Railway/Vercel),
 * which makes createSessionToken() throw AFTER the password is verified — so
 * users authenticate correctly but still can't log in.
 */

interface RequiredVar {
  name: string;
  hint: string;
}

const REQUIRED_VARS: RequiredVar[] = [
  {
    name: 'ADMIN_SESSION_SECRET',
    hint: 'signs session cookies — login returns 500 for every user without it',
  },
];

function isSet(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check required env vars. Returns the list of missing ones (empty = all good).
 * Logs a loud, unmissable banner to the deploy logs when anything is missing.
 */
export function validateRuntimeConfig(): string[] {
  const missing: string[] = [];

  for (const v of REQUIRED_VARS) {
    if (!isSet(process.env[v.name])) missing.push(`${v.name} — ${v.hint}`);
  }

  // DATABASE_URL accepts either canonical or project-prefixed name.
  if (!isSet(process.env.DATABASE_URL) && !isSet(process.env.fastget_DATABASE_URL)) {
    missing.push('DATABASE_URL (or fastget_DATABASE_URL) — Postgres connection string');
  }

  if (missing.length > 0) {
    logger.error('Config', 'Missing required environment variables at startup', { missing });
    // Plain console banner too: guarantees visibility even if LOG_LEVEL filters,
    // and stands out in Railway/Vercel deploy logs.
    console.error('\n============================================================');
    console.error('  FATAL CONFIG — missing required environment variables:');
    for (const m of missing) console.error('    • ' + m);
    console.error('  Set these in your hosting env (e.g. Railway → Variables)');
    console.error('  and redeploy. Auth will not work until this is fixed.');
    console.error('============================================================\n');
  } else {
    logger.info('Config', 'Runtime config check passed — all required env vars present');
  }

  return missing;
}
