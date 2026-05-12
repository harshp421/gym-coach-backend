-- 0005_resend_rate_limit.sql
-- Tracks the last time we sent a verification email so we can rate-limit
-- the resend endpoint. Cheaper than a separate rate-limit store and the
-- value is durable across restarts.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_verification_sent_at TIMESTAMPTZ;
