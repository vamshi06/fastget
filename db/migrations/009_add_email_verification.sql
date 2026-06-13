-- Migration 009: Add email verification and password reset fields to users table
--
-- DEFAULT true on email_verified ensures all EXISTING users are treated as verified
-- (backward compatible). New signups will be created with email_verified = false
-- until they click the verification link.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified          BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_token      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_password_token    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_password_token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_verification_at  TIMESTAMPTZ;

-- Partial unique indexes for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token)
  WHERE verification_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_password_token
  ON users(reset_password_token)
  WHERE reset_password_token IS NOT NULL;
