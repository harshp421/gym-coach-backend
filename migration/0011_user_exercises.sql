-- 0011_user_exercises.sql
-- User-authored exercises. Mirrors the seeded `exercises` schema but owned
-- per user. plan_exercises gets a sibling FK + a CHECK so each row sources
-- from exactly one of the two catalogs.
-- Idempotent.

CREATE TABLE IF NOT EXISTS user_exercises (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name                TEXT NOT NULL,
    slug                TEXT NOT NULL,
    primary_muscles     TEXT[] NOT NULL DEFAULT '{}',
    secondary_muscles   TEXT[] NOT NULL DEFAULT '{}',
    equipment           TEXT,
    mechanic            TEXT,
    level               TEXT NOT NULL DEFAULT 'beginner',
    instructions        TEXT[] NOT NULL DEFAULT '{}',
    demo_url            TEXT,

    archived_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, slug),

    CONSTRAINT user_exercises_level_chk
        CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT user_exercises_mechanic_chk
        CHECK (mechanic IS NULL OR mechanic IN ('compound', 'isolation')),
    CONSTRAINT user_exercises_name_chk
        CHECK (length(trim(name)) BETWEEN 1 AND 80),
    CONSTRAINT user_exercises_primary_muscles_chk
        CHECK (cardinality(primary_muscles) BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_user_exercises_user_active
    ON user_exercises (user_id) WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_user_exercises ON user_exercises;
CREATE TRIGGER set_updated_at_user_exercises
    BEFORE UPDATE ON user_exercises
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- plan_exercises: add a sibling FK to user_exercises, allow exercise_id
-- to be NULL, and CHECK exactly one of the two is set.
-- ---------------------------------------------------------------------------

ALTER TABLE plan_exercises
    ADD COLUMN IF NOT EXISTS user_exercise_id UUID
        REFERENCES user_exercises(id);

-- Drop NOT NULL only if it still has it (idempotency).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'plan_exercises'
          AND column_name = 'exercise_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE plan_exercises ALTER COLUMN exercise_id DROP NOT NULL;
    END IF;
END $$;

-- Add the XOR CHECK if it doesn't exist already.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plan_exercises_one_source_chk'
    ) THEN
        ALTER TABLE plan_exercises ADD CONSTRAINT plan_exercises_one_source_chk
            CHECK (
                (exercise_id IS NOT NULL AND user_exercise_id IS NULL)
             OR (exercise_id IS NULL AND user_exercise_id IS NOT NULL)
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plan_exercises_user_exercise_id
    ON plan_exercises (user_exercise_id) WHERE user_exercise_id IS NOT NULL;
