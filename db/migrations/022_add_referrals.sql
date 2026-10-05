-- Migration 022: Referral program (cash payout).
--
-- Every customer gets a users.referral_code (generated lazily the first time
-- they open the Refer & Earn page - see getOrCreateReferralCode in
-- src/lib/users.ts) to share with friends.
--
-- A friend enters that code at checkout on their first order. The order then
-- records the code and the referrer (orders.referral_code / referrer_user_id).
-- It does not change the order's price.
--
-- Once that order is delivered, an admin pays the referrer in cash/UPI outside
-- the app and marks it paid from /admin/referrals, which fills in the
-- referral_paid_* columns (who paid, when, how much, and an optional UPI/txn
-- reference).
--
-- Safe to run multiple times (all statements are idempotent).

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_paid_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_payout_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_payout_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_referrer ON orders(referrer_user_id, created_at DESC) WHERE referrer_user_id IS NOT NULL;
