/**
 * Shared review/feedback edit-window policy. No server-only imports (no
 * `neon`), so both `src/lib/db.ts` (server) and client review components can
 * import it without pulling the DB driver into the browser bundle.
 */

export const REVIEW_EDIT_WINDOW_MINUTES = 10;

/** Whether a review/feedback row created at `createdAt` is still editable. */
export function isWithinReviewEditWindow(createdAt: string | Date): boolean {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Date.now() - created.getTime() < REVIEW_EDIT_WINDOW_MINUTES * 60 * 1000;
}
