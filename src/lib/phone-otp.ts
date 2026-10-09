import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { neon } from '@neondatabase/serverless';
import { logger } from '@/lib/logger';

// One-time codes for phone login (migration 025, table phone_otps). Codes are
// stored only as an HMAC (keyed with ADMIN_SESSION_SECRET), so a database
// leak doesn't reveal live codes. Delivery: src/lib/whatsapp.ts.

export type OtpPurpose = 'login' | 'delete_account';

export const OTP_TTL_SEC = 5 * 60;          // a code is valid for 5 minutes
export const OTP_RESEND_AFTER_SEC = 30;     // min gap between codes to one number
export const OTP_MAX_ATTEMPTS = 5;          // wrong guesses before the code dies

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
  return neon(databaseUrl.replace('-pooler', ''));
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET env var is not set');
  return secret;
}

/**
 * Indian mobile number -> its 10 digits, or null. Accepts "+91 98765 43210",
 * "09876543210", etc. Must start 6-9 (Indian mobile range) - also blocks
 * codes being sent to arbitrary/premium numbers.
 */
export function normalizeIndianMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function hashCode(phone: string, purpose: OtpPurpose, code: string): string {
  return createHmac('sha256', getSecret()).update(`${purpose}:${phone}:${code}`).digest('hex');
}

/**
 * Create a new code for this number/purpose (invalidating earlier ones).
 * Returns the plain code for the caller to send, or a wait time if a code
 * was sent too recently.
 */
export async function issueOtp(
  phone: string,
  purpose: OtpPurpose,
): Promise<{ ok: true; code: string } | { ok: false; retryAfterSec: number }> {
  const sql = getClient();
  const recent = (await sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age
    FROM phone_otps
    WHERE phone = ${phone} AND purpose = ${purpose}
    ORDER BY created_at DESC LIMIT 1
  `) as { age: number }[];
  if (recent[0] && recent[0].age < OTP_RESEND_AFTER_SEC) {
    return { ok: false, retryAfterSec: OTP_RESEND_AFTER_SEC - recent[0].age };
  }

  const code = String(randomInt(100000, 1000000));
  // Only the newest code is valid.
  await sql`
    UPDATE phone_otps SET consumed_at = NOW()
    WHERE phone = ${phone} AND purpose = ${purpose} AND consumed_at IS NULL
  `;
  await sql`
    INSERT INTO phone_otps (phone, purpose, code_hash, expires_at)
    VALUES (${phone}, ${purpose}, ${hashCode(phone, purpose, code)},
            NOW() + (${OTP_TTL_SEC} * INTERVAL '1 second'))
  `;
  return { ok: true, code };
}

export type OtpCheck = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

/** Check a code. A correct code is consumed, so it works only once. */
export async function verifyOtp(phone: string, purpose: OtpPurpose, code: unknown): Promise<OtpCheck> {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return 'invalid';
  const sql = getClient();
  const rows = (await sql`
    SELECT id, code_hash, attempts, expires_at > NOW() AS live
    FROM phone_otps
    WHERE phone = ${phone} AND purpose = ${purpose} AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `) as { id: string; code_hash: string; attempts: number; live: boolean }[];

  const row = rows[0];
  if (!row || !row.live) return 'expired';
  if (row.attempts >= OTP_MAX_ATTEMPTS) return 'too_many_attempts';

  const expected = Buffer.from(row.code_hash, 'hex');
  const given = Buffer.from(hashCode(phone, purpose, code), 'hex');
  if (expected.length === given.length && timingSafeEqual(expected, given)) {
    await sql`UPDATE phone_otps SET consumed_at = NOW() WHERE id = ${row.id}`;
    return 'ok';
  }

  await sql`UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ${row.id}`;
  logger.warn('PhoneOtp', 'wrong code', { purpose, attempts: row.attempts + 1 });
  return row.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid';
}

// ── "Number verified" proof for new customers ──────────────────────────────
// After a correct code for a number with no account, the customer still has
// to enter their name. Instead of keeping the code alive, they get a short
// signed token proving the number was verified, which the "complete signup"
// step accepts.

const PROOF_TTL_SEC = 15 * 60;

export function createPhoneProof(phone: string): string {
  const body = Buffer.from(JSON.stringify({ phone, exp: Math.floor(Date.now() / 1000) + PROOF_TTL_SEC })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(`phone-proof.${body}`).digest('base64url');
  return `${body}.${sig}`;
}

/** The verified phone number inside a valid, unexpired proof - or null. */
export function readPhoneProof(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(createHmac('sha256', getSecret()).update(`phone-proof.${body}`).digest('base64url'));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { phone, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) return null;
    return normalizeIndianMobile(phone);
  } catch {
    return null;
  }
}
