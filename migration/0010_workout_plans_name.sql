-- 0010_workout_plans_name.sql
-- Custom plans phase: user-supplied plan name. Generator-created plans
-- leave it NULL; UI falls back to the split-type label.
-- Idempotent.

ALTER TABLE workout_plans
    ADD COLUMN IF NOT EXISTS name TEXT;
