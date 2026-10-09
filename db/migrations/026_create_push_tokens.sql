-- Migration 026: Push notification tokens for the Android app.
--
-- One row per app install that a signed-in customer allowed notifications on.
-- The app (mobile/) gets an Expo push token and hands it to the site, which
-- registers it against the session's user (POST /api/push/register). Order
-- status changes then push to every token the order's customer has
-- (src/lib/push.ts).
--
-- token is unique: signing into another account on the same phone moves the
-- token to that account. Logging out deletes it, and src/lib/push.ts deletes
-- tokens Expo reports as DeviceNotRegistered (app uninstalled). locale is the
-- site language at registration, so pushes arrive in English or Hindi.
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS push_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL,
  platform    VARCHAR(16) NOT NULL DEFAULT 'android',
  locale      VARCHAR(8) NOT NULL DEFAULT 'en',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_push_tokens_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
