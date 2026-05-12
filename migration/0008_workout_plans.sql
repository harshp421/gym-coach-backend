-- 0008_workout_plans.sql
-- Plan = a user's current weekly training program. One active per user
-- (enforced by the partial unique index). Days are an ordered list of
-- sessions. Plan exercises are the ordered exercise prescriptions in each day.

CREATE TABLE IF NOT EXISTS workout_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'active',
    split_type      TEXT NOT NULL,
    days_per_week   INT NOT NULL,
    goal            TEXT NOT NULL,
    notes           TEXT,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT workout_plans_status_chk
        CHECK (status IN ('active', 'archived')),
    CONSTRAINT workout_plans_split_chk
        CHECK (split_type IN
            ('full_body', 'upper_lower', 'push_pull_legs', 'bro_split', 'custom')),
    CONSTRAINT workout_plans_days_chk
        CHECK (days_per_week BETWEEN 1 AND 7),
    CONSTRAINT workout_plans_goal_chk
        CHECK (goal IN ('cut', 'maintain', 'bulk', 'recomp'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_one_active_per_user
    ON workout_plans (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans (user_id);

DROP TRIGGER IF EXISTS set_updated_at_workout_plans ON workout_plans;
CREATE TRIGGER set_updated_at_workout_plans
    BEFORE UPDATE ON workout_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS plan_days (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_index     INT NOT NULL,
    name          TEXT NOT NULL,
    weekday_hint  INT,                            -- 0..6 if user picks; nullable
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (plan_id, day_index),
    CONSTRAINT plan_days_weekday_chk
        CHECK (weekday_hint IS NULL OR weekday_hint BETWEEN 0 AND 6)
);

CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days (plan_id);

CREATE TABLE IF NOT EXISTS plan_exercises (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_day_id      UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
    exercise_id      UUID NOT NULL REFERENCES exercises(id),
    position         INT NOT NULL,
    target_sets      INT NOT NULL,
    target_reps_min  INT NOT NULL,
    target_reps_max  INT NOT NULL,
    target_rpe       NUMERIC(3,1),
    rest_seconds     INT,
    notes            TEXT,

    UNIQUE (plan_day_id, position),
    CONSTRAINT plan_exercises_sets_chk CHECK (target_sets > 0 AND target_sets <= 20),
    CONSTRAINT plan_exercises_reps_chk
        CHECK (target_reps_min > 0 AND target_reps_max >= target_reps_min)
);

CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_day_id ON plan_exercises (plan_day_id);
