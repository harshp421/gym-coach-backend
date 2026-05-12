-- 0012_chat.sql
-- AI coach chat. v1: one thread per user. Multi-thread is a future
-- migration (drop the user_id UNIQUE).
-- Idempotent.

CREATE TABLE IF NOT EXISTS chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_chat_sessions ON chat_sessions;
CREATE TRIGGER set_updated_at_chat_sessions
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chat_messages_role_chk
        CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT chat_messages_content_chk
        CHECK (length(content) BETWEEN 1 AND 12000)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
    ON chat_messages (session_id, created_at);
