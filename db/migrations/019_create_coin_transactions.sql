-- Migration 019: Coins loyalty program
--
-- coin_transactions is the ledger: one row per credit or debit — 10% of an
-- order's total credited when it's marked delivered, a checkout redemption
-- (1 coin = ₹1), a refund of a redemption when its order is later cancelled,
-- or a manual admin correction.
--
-- users.coin_balance is a maintained cache of the ledger's running total,
-- kept in sync atomically with each ledger insert in a single statement
-- (see creditCoins/debitCoins/adjustCoinsAdmin in src/lib/db.ts) since the
-- Neon HTTP driver has no multi-statement transactions.
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('order_delivered', 'redemption', 'redemption_refund', 'admin_adjustment')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);

-- One earn-credit and one refund per order — guards against double-crediting on retry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_order_delivered ON coin_transactions(order_id) WHERE reason = 'order_delivered';
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_order_refund ON coin_transactions(order_id) WHERE reason = 'redemption_refund';

ALTER TABLE users ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0;
