CREATE TABLE IF NOT EXISTS about_me_sessions(
 id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
visitor_id TEXT NOT NULL UNIQUE,
summary TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- about_me_messages: every turn
CREATE TABLE IF NOT EXISTS about_me_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES about_me_sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    archived    BOOLEAN NOT NULL DEFAULT false,   -- ← your choice: summarized rows flip to true
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT about_me_messages_role_chk CHECK (role IN ('user', 'assistant'))
);

-- index supports "load recent NON-archived messages, oldest→newest"
CREATE INDEX IF NOT EXISTS idx_about_me_messages_active
    ON about_me_messages (session_id, archived, created_at);