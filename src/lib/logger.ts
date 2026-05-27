/**
 * Centralized structured logger for FastGet.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Cart', 'Item added', { productId, quantity });
 *   logger.api('POST', '/api/orders', 201, 312);
 *
 * To silence all non-error logs in production, set LOG_LEVEL=error in env.
 * To enable debug logs in production, set LOG_LEVEL=debug in env.
 */

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVELS: Record<Level, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

function resolveMinLevel(): number {
  const env = process.env.LOG_LEVEL?.toUpperCase() as Level | undefined;
  if (env && LEVELS[env] !== undefined) return LEVELS[env];
  // Production default: INFO and above (no DEBUG spam)
  return process.env.NODE_ENV === 'production' ? LEVELS.INFO : LEVELS.DEBUG;
}

const MIN_LEVEL = resolveMinLevel();

function ts(): string {
  return new Date().toTimeString().slice(0, 8); // HH:MM:SS
}

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= MIN_LEVEL;
}

// Sanitise meta: strip keys that may hold secrets.
const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'token', 'secret', 'authorization',
  'pin', 'updateToken', 'statusToken', 'apiKey', 'accessToken',
]);

function sanitise(meta: object): object {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

function metaStr(meta?: object): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(sanitise(meta));
  } catch {
    return '';
  }
}

function write(level: Level, module: string, message: string, meta?: object): void {
  if (!shouldLog(level)) return;
  const line = `[${ts()}] [${level.padEnd(5)}] [${module}] ${message}${metaStr(meta)}`;
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (module: string, message: string, meta?: object) =>
    write('DEBUG', module, message, meta),

  info: (module: string, message: string, meta?: object) =>
    write('INFO', module, message, meta),

  warn: (module: string, message: string, meta?: object) =>
    write('WARN', module, message, meta),

  error: (module: string, message: string, meta?: object) =>
    write('ERROR', module, message, meta),

  /**
   * Structured API request/response log.
   * Example: [12:10:04] [API  ] [INFO ] POST /api/orders → 201 (312ms)
   */
  api: (
    method: string,
    path: string,
    status: number,
    durationMs: number,
    meta?: object,
  ) => {
    const level: Level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    if (!shouldLog(level)) return;
    const line = `[${ts()}] [API  ] [${level.padEnd(5)}] ${method} ${path} → ${status} (${durationMs}ms)${metaStr(meta)}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
  },
};
