-- 0003_email_verification.sql
-- Add verification token columns to users (column-on-users approach,
-- no separate table). Token is hashed (never stored in plain).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- Partial index: only users with a pending token. Fast lookup, tiny index.
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
    ON users (email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;
