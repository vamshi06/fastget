// HMAC-SHA-256 signed session tokens.
// Uses globalThis.crypto (Web Crypto API) — works in Edge runtime and Node 18+.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE_NAME = 'fastget_session';

// Admin sessions stay short-lived for security. Customer sessions are long-lived
// and slide-refreshed on each app load (see GET /api/auth/me) so an active
// shopper is never silently logged out mid-checkout.
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function sessionMaxAge(role: string): number {
  return role === 'admin' ? ADMIN_SESSION_MAX_AGE : CUSTOMER_SESSION_MAX_AGE;
}

export interface SessionPayload {
  userId: string;
  role: string;
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

// HMAC-SHA-256, built by hand from crypto.subtle.digest() rather than
// crypto.subtle.sign()/verify(). Railway's self-hosted Next.js Edge runtime
// has a real bug where sign()/verify() do not round-trip — a token signed
// and verified back-to-back in the very same request, with the confirmed
// same key, still fails (see git history for the diagnostic that proved
// this). digest() alone was confirmed reliable, so HMAC is constructed from
// it directly using the standard RFC 2104 construction, sidestepping the
// broken primitive entirely instead of depending on it.
const SHA256_BLOCK_SIZE = 64;

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data as BufferSource);
  return new Uint8Array(digest);
}

async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const keyBytes = key.length > SHA256_BLOCK_SIZE ? await sha256(key) : key;
  const paddedKey = new Uint8Array(SHA256_BLOCK_SIZE);
  paddedKey.set(keyBytes);

  const ipad = new Uint8Array(SHA256_BLOCK_SIZE);
  const opad = new Uint8Array(SHA256_BLOCK_SIZE);
  for (let i = 0; i < SHA256_BLOCK_SIZE; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const inner = new Uint8Array(ipad.length + message.length);
  inner.set(ipad);
  inner.set(message, ipad.length);
  const innerHash = await sha256(inner);

  const outer = new Uint8Array(opad.length + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, opad.length);
  return sha256(outer);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET env var is not set');
  return enc.encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secretBytes = getSecret();
  const iat = Math.floor(Date.now() / 1000);
  // Bake the expiry into the signed token (H2) so it is enforced server-side,
  // not just by the browser's cookie Max-Age. exp matches the role's lifetime
  // (admin 8h, customer 30d) and is refreshed when /api/auth/me re-issues.
  const exp = iat + sessionMaxAge(payload.role);
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256' })));
  const body = b64urlEncode(
    enc.encode(JSON.stringify({ userId: payload.userId, role: payload.role, iat, exp })),
  );
  const signing = `${header}.${body}`;
  const sig = await hmacSha256(secretBytes, enc.encode(signing));
  return `${signing}.${b64urlEncode(sig)}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sigB64] = parts;
    const secretBytes = getSecret();
    const sig = new Uint8Array(b64urlDecode(sigB64));
    const expectedSig = await hmacSha256(secretBytes, enc.encode(`${header}.${body}`));
    if (!timingSafeEqual(sig, expectedSig)) return null;
    const parsed = JSON.parse(dec.decode(b64urlDecode(body)));
    if (!parsed.userId || !parsed.role) return null;
    // Enforce expiry (H2). Tokens issued before exp existed are treated as
    // expired, forcing a one-time re-login.
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp <= now) return null;
    return { userId: parsed.userId as string, role: parsed.role as string };
  } catch {
    return null;
  }
}

/**
 * Cookie options for a session, with the maxAge derived from the user's role
 * (customers get a long-lived, slide-refreshed cookie; admins stay at 8h).
 */
export function sessionCookieOptions(role: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: sessionMaxAge(role),
  };
}
