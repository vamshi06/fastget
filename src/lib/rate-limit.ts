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

/**
 * Apply several rate rules; returns a ready-to-return 429 if any is exceeded,
 * otherwise null. Buckets are evaluated independently (e.g. per-IP + per-account).
 */
export async function limitOrResponse(rules: RateRule[]): Promise<NextResponse | null> {
  let worst = 0;
  for (const r of rules) {
    const { allowed, retryAfterSec } = await rateLimit(r.key, r.limit, r.windowSec);
    if (!allowed) worst = Math.max(worst, retryAfterSec);
  }
  if (worst > 0) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(worst) } },
    );
  }
  return null;
}
