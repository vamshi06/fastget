-- Migration 025: Phone-number login (WhatsApp OTP).
--
-- PARKED in db/migrations-pending/ on purpose: `npm run sync-schema` runs every
-- file in db/migrations/, and this one must NOT run until phone login is being
-- switched on (it would fail on numbers shared by several accounts). When ready,
-- move it into db/migrations/ and run sync-schema - step-by-step in
-- docs/PHONE_LOGIN_SETUP.md. The feature stays off until
-- NEXT_PUBLIC_PHONE_LOGIN_ENABLED=true.
--
-- 1. Phone numbers become unique per account (on the normalised last 10
--    digits, matching getUserByPhone). Phone login looks accounts up by
--    number, so two accounts on one number would be ambiguous.
--    !! This CREATE UNIQUE INDEX FAILS if any number is still shared by more
--    than one account - resolve those first (the guide has the query).
-- 2. phone_verified records that the number was proven via an OTP.
-- 3. phone_otps holds one-time login codes - HASHED (never the code itself),
--    with expiry and an attempt counter (see src/lib/phone-otp.ts).
--
-- Email stays required (NOT NULL): phone signup asks for it too, as every
-- customer's email-login fallback.
--
-- Safe to run multiple times (all statements are idempotent).

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_last10
  ON users ((RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)));

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS phone_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(10) NOT NULL,              -- normalised 10-digit Indian mobile
  purpose     VARCHAR(20) NOT NULL CHECK (purpose IN ('login', 'delete_account')),
  code_hash   CHAR(64)    NOT NULL,              -- HMAC-SHA-256 hex, see phone-otp.ts
  attempts    INTEGER     NOT NULL DEFAULT 0,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup ON phone_otps(phone, purpose, created_at DESC);
