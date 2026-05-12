-- 0006_profiles_body_metrics.sql
-- Onboarding phase: profiles (1:1 with users) + body_metrics (time series).
-- Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- profiles — slow-changing user identity facts.
-- Most fields nullable so onboarding can save partial state on the way through.
-- onboarding_completed_at is the gate: NULL = wizard not finished.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    date_of_birth           DATE,
    sex                     TEXT,
    height_cm               NUMERIC(5,1),

    goal                    TEXT,
    target_weight_kg        NUMERIC(5,2),
    activity_level          TEXT,

    experience_level        TEXT,
    training_days_per_week  INT,
    equipment_access        TEXT,

    diet_type               TEXT,
    allergies               TEXT[] NOT NULL DEFAULT '{}',
    dislikes                TEXT[] NOT NULL DEFAULT '{}',

    timezone                TEXT,
    units                   TEXT NOT NULL DEFAULT 'metric',

    onboarding_completed_at TIMESTAMPTZ,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Soft validation. Easier to alter later than ENUMs.
    CONSTRAINT profiles_sex_chk
        CHECK (sex IS NULL OR sex IN ('male', 'female', 'other')),
    CONSTRAINT profiles_goal_chk
        CHECK (goal IS NULL OR goal IN ('cut', 'maintain', 'bulk', 'recomp')),
    CONSTRAINT profiles_activity_chk
        CHECK (activity_level IS NULL OR activity_level IN
            ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    CONSTRAINT profiles_experience_chk
        CHECK (experience_level IS NULL OR experience_level IN
            ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT profiles_equipment_chk
        CHECK (equipment_access IS NULL OR equipment_access IN
            ('full_gym', 'home_basic', 'dumbbells_only', 'bodyweight')),
    CONSTRAINT profiles_diet_chk
        CHECK (diet_type IS NULL OR diet_type IN
            ('omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'other')),
    CONSTRAINT profiles_units_chk
        CHECK (units IN ('metric', 'imperial')),
    CONSTRAINT profiles_training_days_chk
        CHECK (training_days_per_week IS NULL
               OR (training_days_per_week BETWEEN 1 AND 7))
);

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- body_metrics — time series. One log per user per day (UPSERT on conflict).
-- At least one of weight / body_fat / waist must be present (CHECK).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS body_metrics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_at   DATE NOT NULL,

    weight_kg     NUMERIC(5,2),
    body_fat_pct  NUMERIC(4,1),
    waist_cm      NUMERIC(5,1),
    notes         TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, recorded_at),
    CONSTRAINT body_metrics_at_least_one_chk
        CHECK (weight_kg IS NOT NULL
               OR body_fat_pct IS NOT NULL
               OR waist_cm IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_body_metrics_user_recorded
    ON body_metrics (user_id, recorded_at DESC);
