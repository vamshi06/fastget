-- Migration 015: Add telegram_chat_id to users.
--
-- Lets an admin/agent link their personal Telegram account (via my-profile)
-- so the new-order notification (src/lib/order-notifications.ts) can DM them
-- directly. NULL means "not linked yet" — that user simply gets skipped for
-- the Telegram leg of the notification (email still goes out).
--
-- Safe to run multiple times (idempotent).

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);
