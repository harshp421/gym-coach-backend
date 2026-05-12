-- 0014_exercise_likes.sql
-- One row per (user, exercise) like. Composite PK gives us idempotent
-- INSERT-on-tap behavior via ON CONFLICT DO NOTHING and prevents duplicates.
-- Likes only attach to seeded `exercises` (the discover gallery is the
-- public catalog) — user_exercises don't get liked.

CREATE TABLE IF NOT EXISTS exercise_likes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, exercise_id)
);

-- "Show my recent likes" + lookup-by-user is the hot path; this index
-- covers both.
CREATE INDEX IF NOT EXISTS idx_exercise_likes_user_created
    ON exercise_likes (user_id, created_at DESC);
