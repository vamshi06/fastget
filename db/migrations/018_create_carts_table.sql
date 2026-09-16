-- Migration 018: Create carts table for server-side persistence of a
-- logged-in user's shopping cart, so it is restored on login on any device.
--
-- One row per user. The items column stores the full CartItem[] snapshot
-- (product snapshot + quantity) exactly as kept in CartContext's client-side
-- state, so restoring the cart on login needs no extra product lookups --
-- same pattern as the wishlists table (see 013_add_product_data_to_wishlists.sql).
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS carts (
  user_id UUID PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
