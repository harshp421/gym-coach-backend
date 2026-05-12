-- 0004_mail_queue.sql
-- Persistent email queue. Workers claim rows with FOR UPDATE SKIP LOCKED
-- so multiple workers can run safely (only one claims any given row).

CREATE TABLE IF NOT EXISTS mail_queue (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email      TEXT NOT NULL,
    subject       TEXT NOT NULL,
    html          TEXT NOT NULL,
    text          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
        -- pending | sending | sent | failed
    attempts      INT NOT NULL DEFAULT 0,
    last_error    TEXT,
    scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: only the rows the worker actually scans.
CREATE INDEX IF NOT EXISTS idx_mail_queue_pending
    ON mail_queue (scheduled_at)
    WHERE status = 'pending';
