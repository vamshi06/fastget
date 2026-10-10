/**
 * Returns `path` if it is a same-site path ("/checkout?x=1"), else null.
 *
 * `startsWith('/') && !startsWith('//')` alone is not enough: browsers treat
 * a backslash like a slash, so "/\evil.com" resolves to https://evil.com/.
 * Control characters (tabs/newlines are stripped by URL parsers) are refused
 * too. Pure function - safe in middleware (Edge), server and client code.
 */
export function safeRedirectPath(path: unknown): string | null {
  if (typeof path !== 'string' || path.length > 2000) return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return null;
  return path;
}
