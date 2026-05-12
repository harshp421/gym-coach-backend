-- 0007_exercises.sql
-- Exercise catalog. Seeded from the free-exercise-db dataset
-- (https://github.com/yuhonas/free-exercise-db, MIT licensed) via
-- `npm run seed:exercises`. The table is created here; data is loaded
-- by the seed script so we don't bloat migrations.

CREATE TABLE IF NOT EXISTS exercises (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id        TEXT UNIQUE NOT NULL,            -- the dataset's "id" / folder name
    slug               TEXT UNIQUE NOT NULL,            -- our URL-safe identifier
    name               TEXT NOT NULL,
    force              TEXT,                            -- 'push' | 'pull' | 'static' | null
    level              TEXT NOT NULL,                   -- normalized to beginner/intermediate/advanced
    mechanic           TEXT,                            -- 'compound' | 'isolation' | null
    equipment          TEXT,                            -- 'barbell' | 'dumbbell' | ... | null
    category           TEXT NOT NULL,                   -- 'strength' | 'cardio' | ...
    primary_muscles    TEXT[] NOT NULL,
    secondary_muscles  TEXT[] NOT NULL DEFAULT '{}',
    instructions       TEXT[] NOT NULL DEFAULT '{}',
    image_urls         TEXT[] NOT NULL DEFAULT '{}',    -- absolute URLs

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT exercises_level_chk
        CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT exercises_mechanic_chk
        CHECK (mechanic IS NULL OR mechanic IN ('compound', 'isolation')),
    CONSTRAINT exercises_force_chk
        CHECK (force IS NULL OR force IN ('push', 'pull', 'static'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_level    ON exercises (level);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment);
-- GIN index on the muscle arrays so `WHERE primary_muscles && ARRAY['chest']` is fast.
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises USING GIN (primary_muscles);

DROP TRIGGER IF EXISTS set_updated_at_exercises ON exercises;
CREATE TRIGGER set_updated_at_exercises
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
