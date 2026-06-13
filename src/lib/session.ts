// HMAC-SHA-256 signed session tokens.
// Uses globalThis.crypto (Web Crypto API) — works in Edge runtime and Node 18+.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE_NAME = 'fastget_session';
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

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

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET env var is not set');
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const key = await getKey();
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256' })));
  const body = b64urlEncode(
    enc.encode(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })),
  );
  const signing = `${header}.${body}`;
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(signing));
  return `${signing}.${b64urlEncode(sig)}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sigB64] = parts;
    const key = await getKey();
    const sig = b64urlDecode(sigB64);
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      enc.encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const parsed = JSON.parse(dec.decode(b64urlDecode(body)));
    if (!parsed.userId || !parsed.role) return null;
    return { userId: parsed.userId as string, role: parsed.role as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
};
