/**
 * Lightweight input-validation primitives for API routes.
 *
 * Design: each primitive returns the cleaned value or THROWS a ValidationError
 * whose message is safe to show the user. Routes already wrap their handlers in
 * try/catch; add one branch at the top of the catch:
 *
 *   if (error instanceof ValidationError) {
 *     return NextResponse.json({ success: false, error: error.message }, { status: 400 });
 *   }
 *
 * This keeps each route's shape intact while replacing ad-hoc inline checks.
 * SQL is already parameterized everywhere, so these guard against malformed /
 * oversized / out-of-range input that would otherwise 500 or write bad data —
 * NOT against injection.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Title-case a field name for messages: "imageUrl" -> "Image url". */
function label(field: string): string {
  const spaced = field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

interface StringOpts {
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
}

/**
 * Require a non-empty (after trim) string within [min, max] length, optionally
 * matching `pattern`. Returns the trimmed value.
 */
export function requireString(value: unknown, field: string, opts: StringOpts = {}): string {
  const { min = 1, max = 1000, pattern, patternMsg } = opts;
  if (typeof value !== 'string') {
    throw new ValidationError(`${label(field)} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(
      min <= 1
        ? `${label(field)} is required.`
        : `${label(field)} must be at least ${min} characters.`,
    );
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${label(field)} must be at most ${max} characters.`);
  }
  if (pattern && !pattern.test(trimmed)) {
    throw new ValidationError(patternMsg || `Please enter a valid ${label(field).toLowerCase()}.`);
  }
  return trimmed;
}

/**
 * Optional string: undefined/null/empty -> undefined; otherwise validated like
 * requireString (with min defaulting to 0 so an explicit empty string is just
 * dropped).
 */
export function optionalString(
  value: unknown,
  field: string,
  opts: StringOpts = {},
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim().length === 0) return undefined;
  return requireString(value, field, { min: 1, ...opts });
}

/** Require the value to be one of `allowed`. */
export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ValidationError(`${label(field)} must be one of: ${allowed.join(', ')}.`);
}

/** Optional enum: undefined/null -> undefined; otherwise must be in `allowed`. */
export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (value === undefined || value === null) return undefined;
  return requireEnum(value, allowed, field);
}

interface NumberOpts {
  min?: number;
  max?: number;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Require a finite number within [min, max]. Accepts numeric strings. */
export function requireNumber(value: unknown, field: string, opts: NumberOpts = {}): number {
  const n = toFiniteNumber(value);
  if (n === null) throw new ValidationError(`${label(field)} must be a number.`);
  if (opts.min !== undefined && n < opts.min) {
    throw new ValidationError(`${label(field)} must be at least ${opts.min}.`);
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new ValidationError(`${label(field)} must be at most ${opts.max}.`);
  }
  return n;
}

/** Require a finite integer within [min, max]. */
export function requireInt(value: unknown, field: string, opts: NumberOpts = {}): number {
  const n = requireNumber(value, field, opts);
  if (!Number.isInteger(n)) throw new ValidationError(`${label(field)} must be a whole number.`);
  return n;
}

/** Optional finite number: undefined/null/'' -> undefined; otherwise range-checked. */
export function optionalNumber(
  value: unknown,
  field: string,
  opts: NumberOpts = {},
): number | undefined {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }
  return requireNumber(value, field, opts);
}

// Single '@', non-empty local part, a dotted domain with no leading/trailing dot.
const EMAIL_RE = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/;

/** Validate, lowercase and trim an email address. */
export function requireEmail(value: unknown, field = 'email'): string {
  const s = requireString(value, field, { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(s)) {
    throw new ValidationError('Please enter a valid email address.');
  }
  return s;
}

const PASSWORD_MSG =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

/**
 * Enforce password complexity for SET/CHANGE flows only (signup, reset).
 * NEVER call this on login — existing users must keep signing in with their
 * current passwords.
 */
export function requirePassword(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError(PASSWORD_MSG);
  const ok =
    value.length >= 8 &&
    value.length <= 200 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
  if (!ok) throw new ValidationError(PASSWORD_MSG);
  return value;
}

/** Require a 10-digit phone (ignoring formatting); returns the last 10 digits. */
export function requirePhone10(value: unknown, field = 'phone number'): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Please enter a valid 10-digit phone number.');
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new ValidationError('Please enter a valid 10-digit phone number.');
  }
  return digits.slice(-10);
}

/** Require an http(s) URL no longer than `max` chars. Returns the trimmed URL. */
export function httpUrl(value: unknown, field: string, opts: { max?: number } = {}): string {
  const s = requireString(value, field, { max: opts.max ?? 500 });
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new ValidationError(`${label(field)} must be a valid URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ValidationError(`${label(field)} must start with http:// or https://`);
  }
  return s;
}

interface JsonObjectOpts {
  maxBytes?: number;
  allowedKeys?: readonly string[];
}

/**
 * Ensure `value` is a plain JSON object whose serialized size is within
 * `maxBytes`. Optionally restrict to `allowedKeys`. Returns the object.
 * Guards against storing arbitrarily large/abusive JSON blobs.
 */
export function jsonObject(
  value: unknown,
  field: string,
  opts: JsonObjectOpts = {},
): Record<string, unknown> {
  const { maxBytes = 4096, allowedKeys } = opts;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${label(field)} must be an object.`);
  }
  const obj = value as Record<string, unknown>;
  if (allowedKeys) {
    for (const key of Object.keys(obj)) {
      if (!allowedKeys.includes(key)) {
        throw new ValidationError(`${label(field)} contains an unexpected field: ${key}.`);
      }
    }
  }
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(obj), 'utf8');
  } catch {
    throw new ValidationError(`${label(field)} is not valid JSON.`);
  }
  if (size > maxBytes) {
    throw new ValidationError(`${label(field)} is too large.`);
  }
  return obj;
}
