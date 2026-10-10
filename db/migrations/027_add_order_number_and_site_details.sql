-- Migration 027: short order numbers + delivery-site details on orders.
-- (Comments here must not contain semicolons - scripts/sync-schema.ts splits on them.)
--
-- order_number - a short sequential number customers can read out to support
--   ("FG-10234"), shown everywhere instead of the 32-char status token or a
--   UUID fragment. BIGSERIAL backfills existing rows on ALTER. Displayed as
--   FG-<10000 + order_number> (see formatOrderNumber in src/lib/utils.ts).
-- site_pincode - collected at checkout, must be inside the service area
--   (src/lib/service-area.ts).
-- site_lat / site_lng - optional "use my current location" pin from checkout,
--   so the delivery team can open the exact site in Maps.
-- gstin / business_name - optional GST details, printed on the invoice.
--
-- user_addresses.pincode - saved with an address so checkout can prefill it.
--
-- The app writes the order columns best-effort after the order insert, so
-- orders still go through if this hasn't been run yet - but run it before
-- deploying so the details are kept.
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS site_pincode VARCHAR(6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS site_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS site_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_name VARCHAR(200);

ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS pincode VARCHAR(6);
