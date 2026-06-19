import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Postgres-backed fixed-window rate limiter (H3).
 *
 * Works on serverless (Vercel) where in-memory counters are useless — state
 * lives in Neon. One row per bucket, reset when its window elapses, so the
 * table stays bounded by the number of active keys.
 *
 * Fails OPEN: if the limiter's own DB call errors, requests are allowed rather
 * than locking everyone out of auth on a limiter hiccup.
 */

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
  return neon(databaseUrl);
}

async function ensureTable(): Promise<void> {
  const sql = getClient();
  await sql`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

/**
 * Read the current count for a bucket WITHOUT incrementing it. Windows that
 * have already elapsed are reported as 0 (the next hit would reset them anyway).
 * Used for pre-checks where we must not count the request itself (e.g. so a
 * server-side 500 or a successful login never burns a rate-limit slot).
 */
async function peek(key: string, windowSec: number): Promise<{ count: number; resetIn: number }> {
  const sql = getClient();
  const rows = (await sql`
    SELECT count,
      EXTRACT(EPOCH FROM (window_start + (${windowSec} * INTERVAL '1 second') - NOW()))::int AS reset_in
    FROM auth_rate_limits
    WHERE bucket = ${key}
      AND window_start >= NOW() - (${windowSec} * INTERVAL '1 second')
  `) as { count: number; reset_in: number }[];
  if (rows.length === 0) return { count: 0, resetIn: 0 };
  return { count: Number(rows[0].count), resetIn: Number(rows[0].reset_in) };
}

async function hit(key: string, windowSec: number): Promise<{ count: number; resetIn: number }> {
  const sql = getClient();
  const rows = (await sql`
    INSERT INTO auth_rate_limits (bucket, count, window_start)
    VALUES (${key}, 1, NOW())
    ON CONFLICT (bucket) DO UPDATE SET
      count = CASE
        WHEN auth_rate_limits.window_start < NOW() - (${windowSec} * INTERVAL '1 second')
        THEN 1 ELSE auth_rate_limits.count + 1 END,
      window_start = CASE
        WHEN auth_rate_limits.window_start < NOW() - (${windowSec} * INTERVAL '1 second')
        THEN NOW() ELSE auth_rate_limits.window_start END
    RETURNING count,
      EXTRACT(EPOCH FROM (window_start + (${windowSec} * INTERVAL '1 second') - NOW()))::int AS reset_in
  `) as { count: number; reset_in: number }[];
  return { count: Number(rows[0].count), resetIn: Number(rows[0].reset_in) };
}

/**
 * Record a hit against `key` and report whether it is now over `limit` within
 * the rolling `windowSec`. Fails open on DB errors.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    let res;
    try {
      res = await hit(key, windowSec);
    } catch (error) {
      if (error instanceof Error && /relation "auth_rate_limits" does not exist/.test(error.message)) {
        await ensureTable();
        res = await hit(key, windowSec);
      } else {
        throw error;
      }
    }
    const allowed = res.count <= limit;
    return { allowed, retryAfterSec: allowed ? 0 : Math.max(1, res.resetIn) };
  } catch (error) {
    logger.error('RateLimit', 'limiter error — failing open', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export interface RateRule {
  key: string;
  limit: number;
  windowSec: number;
}

function tooManyResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

/**
 * Apply several rate rules; returns a ready-to-return 429 if any is exceeded,
 * otherwise null. Buckets are evaluated independently (e.g. per-IP + per-account).
 *
 * NOTE: this INCREMENTS every bucket, so the request itself counts. Endpoints
 * where a server error or success must not count toward the limit should use
 * peekLimit() + recordFailedAttempt() instead (see the login route).
 */
export async function limitOrResponse(rules: RateRule[]): Promise<NextResponse | null> {
  let worst = 0;
  for (const r of rules) {
    const { allowed, retryAfterSec } = await rateLimit(r.key, r.limit, r.windowSec);
    if (!allowed) worst = Math.max(worst, retryAfterSec);
  }
  return worst > 0 ? tooManyResponse(worst) : null;
}

/**
 * Read-only check: returns a 429 if any bucket is ALREADY at/over its limit,
 * without incrementing anything. Fails OPEN on DB errors.
 *
 * Pair with recordFailedAttempt(): only genuine failed attempts get counted, so
 * a server-side 500 or a successful login can never lock a user out.
 */
export async function peekLimit(rules: RateRule[]): Promise<NextResponse | null> {
  let worst = 0;
  for (const r of rules) {
    try {
      const { count, resetIn } = await peek(r.key, r.windowSec);
      if (count >= r.limit) worst = Math.max(worst, Math.max(1, resetIn));
    } catch (error) {
      logger.error('RateLimit', 'peek error — failing open', {
        key: r.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return worst > 0 ? tooManyResponse(worst) : null;
}

/**
 * Record one failed attempt against each bucket (increments the counters).
 * Best-effort: never throws, so it can't turn a 401 into a 500.
 */
export async function recordFailedAttempt(rules: RateRule[]): Promise<void> {
  await Promise.all(
    rules.map((r) => rateLimit(r.key, r.limit, r.windowSec).then(() => undefined)),
  );
}

/**
 * Clear buckets (e.g. on a successful login) so earlier failed attempts don't
 * leave a legitimate user near the limit. Best-effort; never throws.
 */
export async function clearBuckets(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const sql = getClient();
    await sql`DELETE FROM auth_rate_limits WHERE bucket = ANY(${keys})`;
  } catch (error) {
    logger.error('RateLimit', 'clearBuckets error — ignoring', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
