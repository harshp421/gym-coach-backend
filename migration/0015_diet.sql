-- 0015_diet.sql
-- Diet preferences (1:1 with users) + diet_plans with the meals payload as
-- JSONB. JSONB because plans are read as a unit and never queried per-meal
-- across users at this stage. Normalize later if logging/per-meal swaps land.

-- ---------------------------------------------------------------------------
-- diet_preferences
--   Defaults chosen so the table doubles as "minimum viable prefs" if the
--   user opens the plan before answering the questionnaire — completed_at
--   being NULL is the gate to force them through it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diet_preferences (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    meals_per_day    INT  NOT NULL DEFAULT 3,
    cooking_time     TEXT NOT NULL DEFAULT 'moderate',
    cuisines         TEXT[] NOT NULL DEFAULT '{}',
    budget_tier      TEXT NOT NULL DEFAULT 'mid',
    favorite_foods   TEXT[] NOT NULL DEFAULT '{}',
    include_snacks   BOOLEAN NOT NULL DEFAULT true,
    completed_at     TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT diet_prefs_meals_chk
        CHECK (meals_per_day BETWEEN 2 AND 6),
    CONSTRAINT diet_prefs_cooking_chk
        CHECK (cooking_time IN ('quick', 'moderate', 'leisurely')),
    CONSTRAINT diet_prefs_budget_chk
        CHECK (budget_tier IN ('budget', 'mid', 'premium'))
);

DROP TRIGGER IF EXISTS set_updated_at_diet_preferences ON diet_preferences;
CREATE TRIGGER set_updated_at_diet_preferences
    BEFORE UPDATE ON diet_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- diet_plans
--   `meals` JSONB is validated app-side via zod before insert. We don't
--   enforce structure in Postgres so the AI's evolving response shape can
--   change without a migration.
--
--   Partial UNIQUE index enforces one active plan per user — same pattern
--   as workout_plans.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diet_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'active',

    calorie_target    INT NOT NULL,
    protein_target_g  INT NOT NULL,
    carb_target_g     INT NOT NULL,
    fat_target_g      INT NOT NULL,

    notes             TEXT,
    meals             JSONB NOT NULL DEFAULT '[]'::jsonb,

    generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT diet_plans_status_chk
        CHECK (status IN ('active', 'archived')),
    CONSTRAINT diet_plans_calorie_chk
        CHECK (calorie_target BETWEEN 800 AND 6000),
    CONSTRAINT diet_plans_macros_chk
        CHECK (
            protein_target_g BETWEEN 30 AND 400
            AND carb_target_g BETWEEN 0 AND 700
            AND fat_target_g BETWEEN 10 AND 250
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_diet_plans_one_active_per_user
    ON diet_plans (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_diet_plans_user_id ON diet_plans (user_id);

DROP TRIGGER IF EXISTS set_updated_at_diet_plans ON diet_plans;
CREATE TRIGGER set_updated_at_diet_plans
    BEFORE UPDATE ON diet_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
