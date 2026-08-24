-- Migration 014: Drop the legacy variant_id column from wishlists.
--
-- Commit 13f8e5d migrated the wishlist schema from a variant_id-keyed design
-- to product_id + product_data (see migration 013), but never dropped the old
-- column from tables created before that change. It's NOT NULL and unused by
-- any current code path (getWishlistByUserId / addToWishlist both key off
-- product_id), so it just sits there as dead weight that would reject any
-- future raw INSERT that doesn't supply it.
--
-- Safe to run multiple times (IF EXISTS guard).

ALTER TABLE wishlists DROP COLUMN IF EXISTS variant_id;
