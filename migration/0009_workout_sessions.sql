-- 0009_workout_sessions.sql
-- Workout logging: a session is one occurrence of a plan_day; set_logs are
-- the actual reps/weights the user did. Plan tables stay the prescription;
-- these tables are immutable history.
--
-- Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- workout_sessions — one row per workout occurrence.
-- One in-progress session per user (partial UNIQUE on completed_at IS NULL).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id       UUID NOT NULL REFERENCES workout_plans(id),
    plan_day_id   UUID NOT NULL REFERENCES plan_days(id),

    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    notes         TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_one_active_per_user
    ON workout_sessions (user_id) WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started
    ON workout_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_day_id
    ON workout_sessions (plan_day_id);

DROP TRIGGER IF EXISTS set_updated_at_workout_sessions ON workout_sessions;
CREATE TRIGGER set_updated_at_workout_sessions
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- set_logs — one row per actually-logged set.
-- UPSERT on (session_id, plan_exercise_id, set_number) lets clients send the
-- latest values for set N without a separate update path.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS set_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    plan_exercise_id  UUID NOT NULL REFERENCES plan_exercises(id),

    set_number        INT NOT NULL,
    weight_kg         NUMERIC(6,2),     -- NULL = bodyweight; 0 also allowed for "empty bar"
    reps              INT NOT NULL,
    rpe               NUMERIC(3,1),
    notes             TEXT,

    logged_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (session_id, plan_exercise_id, set_number),

    CONSTRAINT set_logs_set_number_chk CHECK (set_number > 0 AND set_number <= 50),
    CONSTRAINT set_logs_reps_chk       CHECK (reps > 0 AND reps <= 500),
    CONSTRAINT set_logs_weight_chk     CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT set_logs_rpe_chk        CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10))
);

CREATE INDEX IF NOT EXISTS idx_set_logs_session
    ON set_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_plan_exercise_logged
    ON set_logs (plan_exercise_id, logged_at DESC);
