-- Migration 013: Add product_data (JSONB) snapshot column to wishlists, and
-- create the table itself if it doesn't exist yet.
--
-- The wishlist feature (commit 13f8e5d) shipped its schema only via
-- initializeWishlistsTable() in src/lib/db.ts, which nothing in production
-- calls (GET /api/init-db only runs initializeDatabase(), not
-- initializeAllTables()). Production's wishlists table was therefore stuck on
-- the pre-product_data shape, causing:
--   [ERROR] [DB] Failed to get wishlist {"error":"column \"product_data\" does not exist"}
--
-- Real schema changes belong here (npm run sync-schema), not in db.ts's
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS calls, which only run for whoever
-- happens to trigger initializeWishlistsTable().
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  product_data JSONB,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishlists_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS product_data JSONB;

-- A unique index enforces the same (user_id, product_id) de-dup guarantee as a
-- named UNIQUE constraint and works fine as an ON CONFLICT target (which is all
-- addToWishlist() needs) — used instead of ADD CONSTRAINT because Postgres has
-- no ADD CONSTRAINT IF NOT EXISTS, and the DO $$ EXCEPTION block that would
-- otherwise guard it isn't safe here: sync-schema.ts splits each file on a bare
-- semicolon, which shreds a dollar-quoted PL/pgSQL block into invalid fragments.
CREATE UNIQUE INDEX IF NOT EXISTS uk_wishlists_user_product ON wishlists(user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
